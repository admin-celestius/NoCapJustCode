const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { validateRegistration, checkSchema, paymentSchema } = require('../src/utils/validate');
const { isValidCheckoutSignature } = require('../src/utils/signature');
const Participant = require('../src/models/Participant');

const body = () => ({ teamName: ' Test Duo ', members: [0, 1].map((i) => ({
  name: `Player ${i}`, email: `PLAYER${i}@citchennai.net`, phone: `+91 900000000${i}`,
  department: 'CSE', year: '3', rollNo: ` reg${i} `,
})) });

test('normalizes a complete pair without renaming database fields', () => {
  const { data, errors } = validateRegistration(body());
  assert.deepEqual(errors, []);
  assert.equal(data.teamName, 'Test Duo');
  assert.equal(data.members[0].rollNo, 'REG0');
  assert.equal(data.members[0].email, 'player0@citchennai.net');
  assert.equal(data.members[0].phone, '9000000000');
  assert.equal(data.members[0].year, 3);
  assert.equal(new Participant(data.members[0]).rollNo, 'REG0');
  const participant = new Participant({
    ...data.members[0], registration: '000000000000000000000001', role: 'leader',
  });
  assert.equal(participant.validateSync(), undefined);
  assert.equal(Object.hasOwn(participant.toObject(), 'college'), false);
});

test('older clients may send retired institution fields, but they are not stored', () => {
  const value = body();
  const retiredFields = ['college', 'collegeName', 'college_name', 'institution'];
  for (const field of retiredFields) value.members[0][field] = 'Legacy value';
  const { data, errors } = validateRegistration(value);
  assert.deepEqual(errors, []);
  const participant = new Participant(value.members[0]).toObject();
  for (const field of retiredFields) {
    assert.equal(Object.hasOwn(data.members[0], field), false);
    assert.equal(Object.hasOwn(participant, field), false);
  }
});

test('rejects missing details, malformed types, oversized values and incomplete pairs', () => {
  for (const field of ['name', 'email', 'phone', 'department', 'year', 'rollNo']) {
    const value = body(); delete value.members[1][field];
    assert.ok(validateRegistration(value).errors.some((e) => e.field === `members.1.${field}`), field);
  }
  for (const value of [null, [], {}, { ...body(), members: [null, null] }, { ...body(), members: [body().members[0]] }]) {
    assert.ok(validateRegistration(value).errors.length);
  }
  const value = body(); value.members[0].phone = '123919000000000';
  assert.ok(validateRegistration(value).errors.length);
  value.members[0] = { ...body().members[0], year: 2.5, name: 'x'.repeat(101) };
  assert.equal(validateRegistration(value).errors.length, 2);
});

test('rejects duplicate email, phone and registration number within the pair', () => {
  for (const field of ['email', 'phone', 'rollNo']) {
    const value = body(); value.members[1][field] = value.members[0][field].toLowerCase();
    assert.ok(validateRegistration(value).errors.some((e) => e.field === `members.1.${field}`));
  }
});

test('rejects non-citchennai.net email addresses', () => {
  const value = body();
  value.members[0].email = 'outsider@gmail.com';
  const { errors } = validateRegistration(value);
  assert.ok(errors.some((e) => e.field === 'members.0.email'));
});

test('check and payment endpoints validate malformed input', () => {
  assert.equal(checkSchema.safeParse({ emails: 'not an array' }).success, false);
  assert.equal(checkSchema.safeParse({ teamName: {} }).success, false);
  assert.equal(paymentSchema.safeParse({ razorpay_order_id: {} }).success, false);
});

test('checkout signatures require the matching server order/payment and secret', () => {
  process.env.RAZORPAY_KEY_SECRET = 'unit-test-secret';
  const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('order_test|pay_test').digest('hex');
  assert.ok(isValidCheckoutSignature('order_test', 'pay_test', signature));
  assert.equal(isValidCheckoutSignature('order_other', 'pay_test', signature), false);
  assert.equal(isValidCheckoutSignature('order_test', 'pay_other', signature), false);
  assert.equal(isValidCheckoutSignature('order_test', 'pay_test', 'short'), false);
});

test('capacity defaults to 30 teams and rejects configuration above 60 people', () => {
  const { spawnSync } = require('node:child_process');
  const capacity = require.resolve('../src/services/capacity');
  const env = { ...process.env }; delete env.MAX_TEAMS;
  const defaultCap = spawnSync(process.execPath, ['-e', `process.stdout.write(String(require(${JSON.stringify(capacity)}).MAX_TEAMS))`], { env, encoding: 'utf8' });
  assert.equal(defaultCap.status, 0); assert.equal(defaultCap.stdout, '30');
  const excessive = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(capacity)})`], { env: { ...env, MAX_TEAMS: '31' }, encoding: 'utf8' });
  assert.notEqual(excessive.status, 0); assert.match(excessive.stderr, /cannot exceed 30/);
});

test('a fee different from ₹149 fails instead of silently charging another price', () => {
  const { spawnSync } = require('node:child_process');
  const controller = require.resolve('../src/controllers/registration.controller');
  const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(controller)})`], {
    env: { ...process.env, RAZORPAY_KEY_ID: 'rzp_test_dummy', RAZORPAY_KEY_SECRET: 'test', FEE_PER_PERSON_INR: '150' }, encoding: 'utf8',
  });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /must be 149/);
});
