// This module is test-only. It never reads .env or calls Razorpay.
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');
process.env.MAX_TEAMS = '30';
process.env.HOLD_MINUTES = '15';
process.env.FEE_PER_PERSON_INR = '149';
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = 'integration-test-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173';

const razorpay = require('../src/config/razorpay');
const orders = new Map();
const overrides = new Map();
let sequence = 0;
let failOrder = false;
let failCapture = false;
razorpay.orders.create = async ({ amount, currency }) => {
  if (failOrder) throw { statusCode: 502, error: { description: 'Test gateway unavailable' } };
  const order = { id: `order_Test${++sequence}`, amount, currency };
  orders.set(order.id, order);
  return order;
};
razorpay.payments.fetch = async (id) => {
  const order = orders.get(id.replace(/^pay_/, 'order_'));
  assert.ok(order, 'Only test orders can be fetched');
  return { id, order_id: order.id, amount: order.amount, currency: order.currency,
    status: 'captured', method: 'upi', ...overrides.get(id) };
};
razorpay.payments.capture = async (id) => {
  overrides.set(id, { ...overrides.get(id), status: 'captured' });
  if (failCapture) throw new Error('Test capture race');
  return razorpay.payments.fetch(id);
};
const app = require('../src/app');
const Registration = require('../src/models/Registration');
const Participant = require('../src/models/Participant');
const Payment = require('../src/models/Payment');
const EventConfig = require('../src/models/EventConfig');
const models = [Registration, Participant, Payment, EventConfig];
let teamSeq = 0;
const teamBody = () => {
  const n = ++teamSeq;
  return { teamName: `Test Duo ${n}`, members: [0, 1].map((i) => ({
    name: `Test Player ${n}-${i}`, email: `test${n}-${i}@citchennai.net`,
    phone: String(9000000000 + n * 2 + i), department: 'CSE', year: 3, rollNo: `REG${n}-${i}`,
  })) };
};
const proof = (order) => {
  const paymentId = order.orderId.replace(/^order_/, 'pay_');
  return { razorpay_order_id: order.orderId, razorpay_payment_id: paymentId,
    razorpay_signature: crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${order.orderId}|${paymentId}`).digest('hex') };
};

async function setup(port = 0) {
  const uri = process.env.TEST_MONGO_URI;
  if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\//.test(uri)) {
    throw new Error('TEST_MONGO_URI must explicitly name a disposable loopback MongoDB replica set. No .env or production fallback.');
  }
  const dbName = `loc_integration_${Date.now()}_${process.pid}`;
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
  await Promise.all(models.map((m) => m.init()));
  const server = await new Promise((resolve) => {
    const instance = app.listen(port, '127.0.0.1', () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function api(path, body, headers = {}) {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  const create = (body = teamBody()) => api('/api/registrations/create-order', body);
  const verify = (order) => api('/api/registrations/verify-payment', proof(order));
  const reset = async () => {
    assert.equal(mongoose.connection.name, dbName);
    for (const model of models) await model.deleteMany({});
    orders.clear(); overrides.clear(); failOrder = false; failCapture = false;
  };
  const close = async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  };
  return { api, create, verify, reset, close, base, dbName };
}
module.exports = { setup, teamBody, proof, overrides, Registration, Participant, Payment, EventConfig,
  setFailOrder: (value) => { failOrder = value; }, setFailCapture: (value) => { failCapture = value; } };
