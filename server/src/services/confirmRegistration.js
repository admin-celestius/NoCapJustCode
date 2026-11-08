const crypto = require('crypto');
const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Participant = require('../models/Participant');
const Payment = require('../models/Payment');
const { ensureEventConfig, claimSeat } = require('./capacity');

const genRegCode = () => 'TEAM-' + crypto.randomBytes(3).toString('hex').toUpperCase();
const SOLD_OUT_NOTE = 'Event full at confirmation; refund required';

async function confirmRegistration({ orderId, paymentId, signature, method, via }, attempt = 1) {
  await ensureEventConfig();
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({ razorpayOrderId: orderId }).session(session);
      if (!payment) {
        result = { outcome: 'order_not_found' };
        return;
      }

      const reg = await Registration.findById(payment.registration).session(session);
      if (reg && reg.status === 'confirmed') {
        result = { outcome: 'already_confirmed', registration: reg };
        return;
      }
      // Every terminal decision is stable across verification retries.
      if (reg && reg.status === 'refund_required') {
        result = {
          outcome: payment.note === SOLD_OUT_NOTE ? 'sold_out' :
            payment.note?.startsWith('Duplicate ') ? 'conflict' : 'registration_incomplete',
          field: payment.note?.match(/^Duplicate (\w+)/)?.[1],
          registration: reg,
        };
        return;
      }

      payment.set({
        status: 'paid',
        razorpayPaymentId: paymentId,
        method,
        verifiedVia: payment.verifiedVia || via,
        paidAt: payment.paidAt || new Date(),
      });
      if (signature) payment.razorpaySignature = signature;

      if (!reg) {
        payment.set({ needsReview: true, note: 'Paid, but registration was missing (expired?)' });
        await payment.save({ session });
        result = { outcome: 'registration_missing' };
        return;
      }

      // Independent TTL deletion can remove participants before their team document.
      // Never confirm a partial pair or consume a seat for it.
      const people = await Participant.find({ registration: reg._id }).session(session);
      if (reg.teamSize !== 2 || reg.members.length !== 2 || people.length !== 2 ||
          new Set(reg.members.map(String)).size !== 2 ||
          people.some((p) => p.status !== 'pending' || !p.rollNo || !reg.members.some((id) => id.equals(p._id)))) {
        payment.set({ needsReview: true, note: 'Paid, but participant details were incomplete or expired' });
        await payment.save({ session });
        await Participant.updateMany({ registration: reg._id },
          { $set: { status: 'cancelled' }, $unset: { expiresAt: 1 } }, { session });
        reg.set({ status: 'refund_required', payment: payment._id, expiresAt: undefined });
        await reg.save({ session });
        result = { outcome: 'registration_incomplete' };
        return;
      }

      // Hard cap. If anything below throws (e.g. duplicate email), the transaction aborts
      // and this $inc is rolled back with it.
      const seat = await claimSeat(session);
      if (!seat) {
        payment.set({ needsReview: true, note: SOLD_OUT_NOTE });
        await payment.save({ session });
        await Participant.updateMany(
          { registration: reg._id },
          { $set: { status: 'cancelled' }, $unset: { expiresAt: 1 } },
          { session }
        );
        reg.set({ status: 'refund_required', payment: payment._id, expiresAt: undefined });
        await reg.save({ session });
        result = { outcome: 'sold_out', registration: reg };
        return;
      }

      await payment.save({ session });
      await Participant.updateMany(
        { registration: reg._id },
        { $set: { status: 'confirmed' }, $unset: { expiresAt: 1 } },
        { session }
      );
      reg.set({
        status: 'confirmed',
        payment: payment._id,
        regCode: genRegCode(),
        confirmedAt: new Date(),
        expiresAt: undefined, 
      });
      await reg.save({ session });
      result = { outcome: 'confirmed', registration: reg };
    });
    return result;
  } catch (err) {
    if (err && err.code === 11000) {
      if (err.keyPattern && err.keyPattern.regCode && attempt < 3) {
        return confirmRegistration({ orderId, paymentId, signature, method, via }, attempt + 1);
      }
      if (['email', 'phone', 'rollNo', 'teamName'].some((field) => err.keyPattern?.[field])) {
        return markConflict({ orderId, paymentId, signature, method, via, keyPattern: err.keyPattern });
      }
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

async function markConflict({ orderId, paymentId, signature, method, via, keyPattern }) {
  const field = keyPattern ? Object.keys(keyPattern)[0] : 'unknown';
  let result = { outcome: 'conflict', field };
  await mongoose.connection.transaction(async (session) => {
    const existing = await Payment.findOne({ razorpayOrderId: orderId }).session(session);
    if (!existing) return;
    const reg = await Registration.findById(existing.registration).session(session);
    if (reg?.status === 'confirmed') {
      result = { outcome: 'already_confirmed', registration: reg };
      return;
    }
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      {
        $set: {
          status: 'paid',
          razorpayPaymentId: paymentId,
          ...(signature && { razorpaySignature: signature }),
          method,
          verifiedVia: via,
          paidAt: new Date(),
          needsReview: true,
          note: `Duplicate ${field} at confirmation; refund required`,
        },
      },
      { new: true, session }
    );
    if (payment) {
      await Registration.updateOne(
        { _id: payment.registration },
        { $set: { status: 'refund_required', payment: payment._id }, $unset: { expiresAt: 1 } },
        { session }
      );
      await Participant.updateMany(
        { registration: payment.registration },
        { $set: { status: 'cancelled' }, $unset: { expiresAt: 1 } },
        { session }
      );
    }
  });
  return result;
}

module.exports = { confirmRegistration };
