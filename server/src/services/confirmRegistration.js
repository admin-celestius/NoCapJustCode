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
      // Already turned away as sold out (e.g. order.paid + payment.captured + checkout all
      // arrive for one payment). Keep that decision; never hand this team a seat later.
      if (reg && reg.status === 'refund_required' && payment.note === SOLD_OUT_NOTE) {
        result = { outcome: 'sold_out', registration: reg };
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
      return markConflict({ orderId, paymentId, signature, method, via, keyPattern: err.keyPattern });
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

async function markConflict({ orderId, paymentId, signature, method, via, keyPattern }) {
  const field = keyPattern ? Object.keys(keyPattern)[0] : 'unknown';
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
    { new: true }
  );
  if (payment) {
    await Registration.updateOne(
      { _id: payment.registration },
      { $set: { status: 'refund_required', payment: payment._id }, $unset: { expiresAt: 1 } }
    );
    await Participant.updateMany(
      { registration: payment.registration },
      { $set: { status: 'cancelled' }, $unset: { expiresAt: 1 } }
    );
  }
  return { outcome: 'conflict', field };
}

module.exports = { confirmRegistration };
