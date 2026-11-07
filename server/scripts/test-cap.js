/* eslint-disable no-console */
/**
 * End-to-end test of the registration cap.
 *
 *   TEST_MONGO_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0 node scripts/test-cap.js
 *
 * - Needs a replica set (transactions). Falls back to MONGO_URI if TEST_MONGO_URI is unset.
 * - Always uses a separate database (TEST_DB_NAME, default "cap_test") and WIPES it.
 * - Forces MAX_TEAMS=2, HOLD_MINUTES=15.
 * - Uses the real routes/controllers/services. Only the Razorpay API client is stubbed
 *   (no network, no real keys); webhooks are signed exactly like Razorpay does.
 */
const path = require('path');
const crypto = require('crypto');

process.env.MAX_TEAMS = '2';
process.env.HOLD_MINUTES = '15';
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // does not override the two above
process.env.RAZORPAY_KEY_ID ||= 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET ||= 'test_key_secret';
process.env.RAZORPAY_WEBHOOK_SECRET ||= 'test_webhook_secret';
process.env.FEE_PER_PERSON_INR ||= '100';

const express = require('express');
const mongoose = require('mongoose');

// ---- Stub the Razorpay client before the controllers use it ----
const razorpay = require('../src/config/razorpay');
const rpPayments = new Map();
let orderSeq = 0;
let ordersCreated = 0;
razorpay.orders.create = async ({ amount, currency }) => {
  ordersCreated++;
  return { id: `order_T${Date.now().toString(36)}${++orderSeq}`, amount, currency, status: 'created' };
};
razorpay.payments.fetch = async (id) => {
  const p = rpPayments.get(id);
  if (!p) throw Object.assign(new Error('not found'), { statusCode: 400, error: { description: 'not found' } });
  return p;
};

const registrationRoutes = require('../src/routes/registration.routes');
const { razorpayWebhook } = require('../src/controllers/webhook.controller');
const Registration = require('../src/models/Registration');
const Participant = require('../src/models/Participant');
const Payment = require('../src/models/Payment');
const EventConfig = require('../src/models/EventConfig');

// Same mounting as src/server.js
const app = express();
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);
app.use(express.json({ limit: '50kb' }));
app.use('/api/registrations', registrationRoutes);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

// ---- tiny assertion helpers ----
let failures = 0;
const check = (cond, msg) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const section = (t) => console.log(`\n== ${t}`);

let BASE;
const api = async (method, url, body, headers = {}) => {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

let personSeq = 0;
const person = (label, overrides = {}) => {
  personSeq++;
  return {
    name: `${label} ${personSeq}`,
    email: `p${personSeq}@cap-test.dev`,
    phone: String(6000000000 + personSeq),
    college: 'Test College',
    ...overrides,
  };
};
const teamBody = (name, leader = {}, member = {}) => ({
  teamName: name,
  members: [person(`${name} lead`, leader), person(`${name} member`, member)],
});

const createOrder = (body) => api('POST', '/api/registrations/create-order', body);
const availability = () => api('GET', '/api/registrations/availability').then((r) => r.body);

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const paymentIdFor = (orderId) => 'pay_' + orderId.slice('order_'.length);

function webhook(order, event = 'order.paid') {
  const raw = JSON.stringify({
    entity: 'event',
    event,
    payload: {
      payment: {
        entity: {
          id: paymentIdFor(order.orderId),
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          status: 'captured',
          method: 'upi',
        },
      },
      order: { entity: { id: order.orderId, amount: order.amount, status: 'paid' } },
    },
    created_at: Math.floor(Date.now() / 1000),
  });
  return api('POST', '/api/payments/webhook', raw, {
    'x-razorpay-signature': hmac(process.env.RAZORPAY_WEBHOOK_SECRET, raw),
  });
}

function verifyPayment(order) {
  const paymentId = paymentIdFor(order.orderId);
  rpPayments.set(paymentId, {
    id: paymentId,
    order_id: order.orderId,
    amount: order.amount,
    currency: order.currency,
    status: 'captured',
    method: 'upi',
  });
  return api('POST', '/api/registrations/verify-payment', {
    razorpay_order_id: order.orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: hmac(process.env.RAZORPAY_KEY_SECRET, `${order.orderId}|${paymentId}`),
  });
}

const regOf = (order) => Registration.findById(order.registrationId).lean();
const counter = async () => (await EventConfig.findOne({ key: 'main' }).lean())?.confirmedCount;
// Simulate time passing: move every pending registration's createdAt past the hold window.
const expireHolds = () =>
  Registration.collection.updateMany(
    { status: 'pending' },
    { $set: { createdAt: new Date(Date.now() - 16 * 60 * 1000) } }
  );
const reset = () =>
  Promise.all([Registration, Participant, Payment, EventConfig].map((M) => M.deleteMany({})));

async function mustCreate(body) {
  const r = await createOrder(body);
  if (r.status !== 201) throw new Error(`create-order ${body.teamName} -> ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

// ------------------------------------------------------------------
async function main() {
  const uri = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
  const dbName = process.env.TEST_DB_NAME || 'cap_test';
  if (!uri) throw new Error('Set TEST_MONGO_URI (a replica set) to run this test');
  await mongoose.connect(uri, { dbName });
  console.log(`Using database "${dbName}" (will be wiped). MAX_TEAMS=2 HOLD_MINUTES=15`);
  await Promise.all([Registration, Participant, Payment, EventConfig].map((M) => M.init()));

  const server = app.listen(0);
  BASE = `http://127.0.0.1:${server.address().port}`;

  try {
    // ---------------------------------------------------------------
    section('1. Soft check at create-order (holds)');
    await reset();
    let a = await availability();
    check(a.capacity === 2 && a.confirmed === 0 && a.onHold === 0 && a.remaining === 2 && a.open === true,
      `empty event: ${JSON.stringify(a)}`);

    const t1 = await mustCreate(teamBody('Alpha'));
    const t2 = await mustCreate(teamBody('Bravo'));
    check(['registrationId', 'orderId', 'amount', 'currency', 'keyId', 'prefill'].every((k) => k in t1),
      'create-order response shape unchanged');
    a = await availability();
    check(a.onHold === 2 && a.remaining === 0 && a.open === false, `2 teams in checkout: ${JSON.stringify(a)}`);

    const before = { regs: await Registration.countDocuments(), orders: ordersCreated };
    const blocked = await createOrder(teamBody('Charlie-early'));
    check(blocked.status === 409 && blocked.body.code === 'SOLD_OUT' && blocked.body.message === 'Registrations are full',
      `3rd team while 2 seats on hold -> ${blocked.status} ${JSON.stringify(blocked.body)}`);
    check((await Registration.countDocuments()) === before.regs && ordersCreated === before.orders,
      'no Registration / Razorpay order created for the blocked attempt');

    await expireHolds();
    a = await availability();
    check(a.onHold === 0 && a.remaining === 2 && a.open, `after ${15}+ min, holds released: ${JSON.stringify(a)}`);

    const t3 = await mustCreate(teamBody('Charlie'));
    const t4 = await mustCreate(teamBody('Delta'));
    check(true, 'teams 3 and 4 could start checkout once the holds expired');

    // ---------------------------------------------------------------
    section('2. Hard cap at confirmation (signed order.paid webhooks, sequential)');
    for (const [label, t] of [['team 1', t1], ['team 2', t2], ['team 3', t3]]) {
      const r = await webhook(t);
      check(r.status === 200 && r.body.received === true, `${label} webhook -> ${r.status}`);
    }
    const [r1, r2, r3] = await Promise.all([regOf(t1), regOf(t2), regOf(t3)]);
    check(r1.status === 'confirmed' && /^TEAM-/.test(r1.regCode), `team 1: ${r1.status} ${r1.regCode}`);
    check(r2.status === 'confirmed' && /^TEAM-/.test(r2.regCode), `team 2: ${r2.status} ${r2.regCode}`);
    check(r3.status === 'refund_required' && !r3.regCode && r3.expiresAt === undefined,
      `team 3: ${r3.status}, no regCode, expiresAt unset`);
    const p3 = await Participant.find({ registration: t3.registrationId }).lean();
    check(p3.length === 2 && p3.every((p) => p.status === 'cancelled' && p.expiresAt === undefined),
      'team 3 participants cancelled, expiresAt unset');
    const pay3 = await Payment.findOne({ razorpayOrderId: t3.orderId }).lean();
    check(pay3.status === 'paid' && pay3.needsReview === true && pay3.note === 'Event full at confirmation; refund required',
      `team 3 payment: ${pay3.status}, needsReview=${pay3.needsReview}, "${pay3.note}"`);
    check((await counter()) === 2, `counter = ${await counter()}`);

    section('3. Idempotency (replays must not consume seats)');
    await webhook(t1);
    await webhook(t1, 'payment.captured');
    const v1 = await verifyPayment(t1);
    check(v1.status === 200 && v1.body.success === true && v1.body.regCode === r1.regCode && v1.body.teamName === 'Alpha',
      `verify-payment for confirmed team 1 -> ${v1.status} ${JSON.stringify(v1.body)}`);
    await webhook(t3, 'payment.captured');
    check((await counter()) === 2, `counter still ${await counter()} after replays`);
    check((await regOf(t3)).status === 'refund_required', 'team 3 still refund_required after replay');

    section('4. verify-payment when full');
    const v4 = await verifyPayment(t4);
    check(v4.status === 409 && v4.body.success === false && v4.body.code === 'SOLD_OUT' &&
      v4.body.message === 'Payment received but the event filled up. Your refund will be processed.',
      `team 4 verify-payment -> ${v4.status} ${JSON.stringify(v4.body)}`);
    check((await regOf(t4)).status === 'refund_required', 'team 4 refund_required');

    a = await availability();
    check(a.confirmed === 2 && a.onHold === 0 && a.remaining === 0 && a.open === false,
      `/availability: ${JSON.stringify(a)}`);
    const late = await createOrder(teamBody('Echo'));
    check(late.status === 409 && late.body.code === 'SOLD_OUT', `create-order when full -> ${late.status}`);

    // ---------------------------------------------------------------
    section('5. Concurrency: two webhooks race for the last seat (10 rounds)');
    let okRounds = 0;
    for (let round = 1; round <= 10; round++) {
      await reset();
      const x = await mustCreate(teamBody(`X${round}`));
      // Same payment arriving 3 times at once must consume exactly one seat
      await Promise.all([webhook(x), verifyPayment(x), webhook(x, 'payment.captured')]);
      const sameOrderOk = (await regOf(x)).status === 'confirmed' && (await counter()) === 1;

      // Drop the counter doc: it must be re-seeded from the real count (1), not 0
      await EventConfig.deleteMany({});
      const y = await mustCreate(teamBody(`Y${round}`));
      await expireHolds();
      const z = await mustCreate(teamBody(`Z${round}`));

      const results = await Promise.all([webhook(y), webhook(z)]);
      const statuses = [(await regOf(y)).status, (await regOf(z)).status];
      const confirmed = statuses.filter((s) => s === 'confirmed').length;
      const refunds = statuses.filter((s) => s === 'refund_required').length;
      const total = await Registration.countDocuments({ status: 'confirmed' });
      const c = await counter();
      const ok = sameOrderOk && results.every((r) => r.status === 200) && confirmed === 1 && refunds === 1 && total === 2 && c === 2;
      if (ok) okRounds++;
      else console.log(`    round ${round}: sameOrderOk=${sameOrderOk} statuses=${statuses} total=${total} counter=${c}`);
    }
    check(okRounds === 10, `exactly one of two concurrent last-seat payments confirmed in ${okRounds}/10 rounds`);
    check(true, 'concurrent duplicate deliveries for one order consumed one seat; counter re-seeded correctly');

    // ---------------------------------------------------------------
    section('6. Counter rolls back when the transaction aborts after the $inc');
    await reset();
    const pTeam = await mustCreate(teamBody('Papa', { email: 'shared@cap-test.dev' }));
    // Pending teams may share an email; the clash only surfaces at confirmation,
    // AFTER the seat was claimed, via the unique index on confirmed participants.
    const qTeam = await mustCreate(teamBody('Quebec', { email: 'shared@cap-test.dev' }));
    await webhook(pTeam);
    check((await counter()) === 1, 'team P confirmed, counter = 1');
    await webhook(qTeam);
    const rq = await regOf(qTeam);
    const payQ = await Payment.findOne({ razorpayOrderId: qTeam.orderId }).lean();
    check(rq.status === 'refund_required' && /Duplicate email/.test(payQ.note),
      `team Q hit the duplicate-email conflict: ${rq.status}, "${payQ.note}"`);
    check((await counter()) === 1, `counter rolled back to ${await counter()} (not 2)`);
    a = await availability();
    check(a.confirmed === 1 && a.remaining === 1 && a.open, `/availability: ${JSON.stringify(a)}`);
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
