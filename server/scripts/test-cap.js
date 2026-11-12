// Real HTTP endpoints and MongoDB transactions; only Razorpay's network API is stubbed.
const assert = require('node:assert/strict');
const { setup, teamBody, proof, overrides, Registration, Participant, Payment, EventConfig, setFailOrder, setFailCapture } = require('../test/support');

async function main() {
  const t = await setup();
  let checks = 0;
  const check = (label) => { console.log(`PASS ${label}`); checks++; };
  const expectedAmount = 20518;
  const mustCreate = async (body) => {
    const r = await t.create(body);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.amount, expectedAmount); assert.equal(r.body.currency, 'INR');
    return r.body;
  };
  const availability = async () => (await t.api('/api/registrations/availability')).body;
  const count = async () => (await EventConfig.findOne({ key: 'main' }))?.confirmedCount || 0;
  const expireHolds = () => Registration.collection.updateMany({ status: 'pending' }, { $set: { createdAt: new Date(Date.now() - 16 * 60000) } });
  try {
    await require('../test/startup').checkStartup(process.env.TEST_MONGO_URI);
    check('actual backend entry point starts, connects, initializes indexes and serves health');
    const health = await t.api('/health', undefined, { Origin: 'http://localhost:5173' });
    assert.equal(health.status, 200); assert.equal(health.body.ok, true);
    assert.equal(health.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const deniedOrigin = await t.api('/health', undefined, { Origin: 'https://unlisted.example' });
    assert.equal(deniedOrigin.headers.get('access-control-allow-origin'), null);
    const preflight = await fetch(`${t.base}/api/registrations/create-order`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    assert.equal(preflight.status, 204);
    assert.equal((await t.api('/api/register', {})).status, 404);
    assert.equal((await t.api('/api/payments/webhook', {})).status, 404);
    check('health, development CORS/preflight, JSON 404, no active webhook');

    for (const body of [null, {}, { members: [null, null] }, { ...teamBody(), members: [] }]) {
      assert.equal((await t.create(body)).status, 400);
    }
    assert.equal((await t.api('/api/registrations/check', { emails: 'bad' })).status, 400);
    assert.equal((await Registration.countDocuments()), 0);
    check('invalid requests rejected before persistence');

    setFailOrder(true);
    assert.equal((await t.create()).status, 502);
    assert.equal(await Registration.countDocuments(), 0);
    assert.equal(await Participant.countDocuments(), 0);
    assert.equal((await availability()).onHold, 0);
    setFailOrder(false);
    check('gateway failure cleans up incomplete orders and holds');

    const body = teamBody(); const order = await mustCreate(body);
    assert.equal((await Registration.findById(order.registrationId)).status, 'pending');
    assert.equal(await Participant.countDocuments({ registration: order.registrationId, status: 'pending' }), 2);
    assert.equal((await Payment.findOne({ razorpayOrderId: order.orderId })).status, 'created');
    assert.equal((await availability()).confirmed, 0);
    assert.equal((await availability()).onHold, 1);
    check('complete pending pair persisted; ₹307.26 order (₹298 + taxes); unpaid pair has no confirmed seat');

    const signed = proof(order);
    assert.equal((await t.api('/api/registrations/verify-payment', { ...signed, razorpay_signature: '0'.repeat(64) })).status, 400);
    for (const extra of [{ amount: 1 }, { currency: 'USD' }, { order_id: 'order_other' }, { status: 'failed' }]) {
      overrides.set(signed.razorpay_payment_id, extra);
      assert.equal((await t.verify(order)).status, 400);
      assert.equal(await count(), 0);
    }
    overrides.set(signed.razorpay_payment_id, { status: 'authorized' });
    setFailCapture(true);
    const verified = await t.verify(order);
    assert.equal(verified.status, 200); assert.equal(verified.body.success, true);
    assert.match(verified.body.regCode, /^TEAM-/);
    setFailCapture(false);
    const people = await Participant.find({ registration: order.registrationId });
    assert.equal(people.length, 2);
    assert.ok(people.every((p) => p.status === 'confirmed' && !p.expiresAt && p.rollNo));
    assert.equal((await Payment.findOne({ razorpayOrderId: order.orderId })).status, 'paid');
    const status = await t.api(`/api/registrations/${order.registrationId}/status`);
    assert.equal(status.body.status, 'confirmed'); assert.equal(status.body.regCode, verified.body.regCode);
    check('signature, amount, currency, order and capture verified; pair confirmed atomically');

    const replays = await Promise.all(Array.from({ length: 5 }, () => t.verify(order)));
    assert.ok(replays.every((r) => r.status === 200 && r.body.regCode === verified.body.regCode));
    assert.equal(await count(), 1);
    check('concurrent verification retries consume exactly one team seat');

    for (const field of ['email', 'phone', 'rollNo', 'teamName']) {
      const dupe = teamBody();
      if (field === 'teamName') dupe.teamName = body.teamName.toLowerCase();
      else dupe.members[0][field] = body.members[0][field].toLowerCase();
      const result = await t.create(dupe);
      assert.equal(result.status, 409); assert.equal(result.body.code, 'DUPLICATE_REGISTRATION');
    }
    const duplicateCheck = await t.api('/api/registrations/check', { rollNos: [body.members[0].rollNo.toLowerCase()] });
    assert.equal(duplicateCheck.body.available, false);
    check('confirmed email, phone, team name and registration-number duplicates rejected');

    for (const field of ['email', 'phone', 'rollNo', 'teamName']) {
      await t.reset();
      const first = teamBody(); const second = teamBody();
      if (field === 'teamName') second.teamName = first.teamName.toLowerCase();
      else second.members[0][field] = first.members[0][field].toLowerCase();
      const a = await mustCreate(first); const b = await mustCreate(second);
      const results = await Promise.all([t.verify(a), t.verify(b)]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      assert.equal(await count(), 1); assert.equal(await Participant.countDocuments({ status: 'confirmed' }), 2);
      const loser = results[0].status === 409 ? a : b;
      assert.equal((await t.verify(loser)).status, 409);
      assert.equal((await Registration.findById(loser.registrationId)).status, 'refund_required');
      assert.equal((await Payment.findOne({ razorpayOrderId: loser.orderId })).needsReview, true);
    }
    check('unique-index races roll back seats; every duplicate refund decision is idempotent');

    await t.reset();
    const incomplete = await mustCreate();
    await Participant.deleteOne({ registration: incomplete.registrationId });
    assert.equal((await t.verify(incomplete)).status, 410); assert.equal(await count(), 0);
    assert.equal((await t.verify(incomplete)).status, 410);
    const expired = await mustCreate();
    await Registration.deleteOne({ _id: expired.registrationId });
    assert.equal((await t.verify(expired)).status, 410); assert.equal(await count(), 0);
    check('expired or partial pairs cannot acquire confirmed seats; captured payments flagged for review');

    await t.reset();
    const held = [];
    for (let i = 0; i < 30; i++) held.push(await mustCreate());
    assert.equal((await availability()).remaining, 0);
    assert.equal((await t.create()).body.code, 'SOLD_OUT');
    assert.equal((await availability()).confirmed, 0);
    await expireHolds();
    assert.equal((await availability()).remaining, 30);
    const lateOrders = await Promise.all(Array.from({ length: 4 }, () => mustCreate()));
    check('30 temporary holds block new orders; hold expiry releases all unconfirmed seats');

    const results = await Promise.all([...held, ...lateOrders].map((o) => t.verify(o)));
    assert.equal(results.filter((r) => r.status === 200).length, 30);
    assert.equal(results.filter((r) => r.status === 409 && r.body.code === 'SOLD_OUT').length, 4);
    assert.equal(await Registration.countDocuments({ status: 'confirmed' }), 30);
    assert.equal(await Participant.countDocuments({ status: 'confirmed' }), 60);
    assert.equal(await count(), 30);
    assert.equal((await t.create()).body.code, 'SOLD_OUT');
    assert.equal((await availability()).remaining, 0);
    for (const order of [...held, ...lateOrders]) await t.verify(order);
    assert.equal(await count(), 30);
    check('34 concurrent payments produce exactly 30 confirmed teams / 60 participants; retries cannot exceed capacity');

    await EventConfig.deleteMany({});
    const { ensureEventConfig } = require('../src/services/capacity');
    await Promise.all([ensureEventConfig(), ensureEventConfig(), ensureEventConfig()]);
    assert.equal(await count(), 30);
    check('missing capacity counter safely reseeds from confirmed teams');
    console.log(`All ${checks} integration scenarios passed in disposable database ${t.dbName}`);
  } finally { await t.close(); }
}
main().catch((err) => { console.error(err); process.exitCode = 1; });
