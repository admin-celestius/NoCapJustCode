// Focused registration regression: disposable database, stubbed Razorpay only.
const assert = require('node:assert/strict');
const { setup, teamBody, Participant, Registration, Payment, EventConfig } = require('./support');

async function main() {
  const t = await setup();
  try {
    const submitted = teamBody();
    const order = await t.create(submitted);
    assert.equal(order.status, 201, JSON.stringify(order.body));
    const registrationId = new Registration({ _id: order.body.registrationId })._id;
    const people = await Participant.collection.find({ registration: registrationId }).toArray();
    assert.equal(people.length, 2);
    for (const person of people) {
      for (const field of ['college', 'collegeName', 'college_name', 'institution']) {
        assert.equal(Object.hasOwn(person, field), false);
      }
      assert.ok(person.name && person.email && person.department && person.year && person.rollNo);
    }
    const payment = await Payment.findOne({ razorpayOrderId: order.body.orderId });
    assert.equal(payment.amount, order.body.amount);
    assert.equal(payment.currency, 'INR');
    const verified = await t.verify(order.body);
    assert.equal(verified.status, 200, JSON.stringify(verified.body));
    assert.equal(verified.body.success, true);
    assert.equal(await Participant.countDocuments({ status: 'confirmed' }), 2);
    assert.equal((await EventConfig.findOne({ key: 'main' })).confirmedCount, 1);
    const retry = await t.verify(order.body);
    assert.equal(retry.body.regCode, verified.body.regCode);
    assert.equal((await EventConfig.findOne({ key: 'main' })).confirmedCount, 1);

    const duplicate = teamBody();
    duplicate.members[0].rollNo = submitted.members[0].rollNo.toLowerCase();
    const conflict = await t.create(duplicate);
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, 'DUPLICATE_REGISTRATION');

    const legacy = teamBody();
    legacy.members[0].college = 'Legacy client value';
    const accepted = await t.create(legacy);
    assert.equal(accepted.status, 201);
    const legacyId = new Registration({ _id: accepted.body.registrationId })._id;
    const legacyPeople = await Participant.collection.find({ registration: legacyId }).toArray();
    assert.ok(legacyPeople.every((p) => !Object.hasOwn(p, 'college')));
    console.log('PASS: college-free pair persisted and payment verified; retry, seat count, unique registration numbers and older payloads preserved.');
  } finally {
    await t.close();
  }
}
main().catch((err) => { console.error(err); process.exitCode = 1; });
