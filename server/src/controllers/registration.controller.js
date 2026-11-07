const { isValidObjectId } = require('mongoose');
const razorpay = require('../config/razorpay');
const Registration = require('../models/Registration');
const Participant = require('../models/Participant');
const Payment = require('../models/Payment');
const { validateRegistration } = require('../utils/validate');
const { isValidCheckoutSignature } = require('../utils/signature');
const { confirmRegistration } = require('../services/confirmRegistration');
const capacity = require('../services/capacity');

const TEAM_SIZE = 2;
const FEE_PER_PERSON_PAISE = Math.round(Number(process.env.FEE_PER_PERSON_INR || 0) * 100);
const PENDING_TTL_MS = 24 * 60 * 60 * 1000; 
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

async function findConflicts({ teamName, emails = [], phones = [] }) {
  const [people, team] = await Promise.all([
    Participant.find(
      { status: 'confirmed', $or: [{ email: { $in: emails } }, { phone: { $in: phones } }] },
      'email phone'
    ).lean(),
    teamName
      ? Registration.findOne({ status: 'confirmed', teamName }).collation(CASE_INSENSITIVE).select('_id').lean()
      : null,
  ]);
  return {
    emails: people.map((p) => p.email).filter((e) => emails.includes(e)),
    phones: people.map((p) => p.phone).filter((p) => phones.includes(p)),
    teamName: Boolean(team),
  };
}

const hasConflicts = (c) => c.emails.length || c.phones.length || c.teamName;


exports.checkAvailability = async (req, res, next) => {
  try {
    const emails = (req.body.emails || []).map((e) => String(e).trim().toLowerCase()).slice(0, TEAM_SIZE);
    const phones = (req.body.phones || []).map((p) => String(p).replace(/\D/g, '').slice(-10)).slice(0, TEAM_SIZE);
    const conflicts = await findConflicts({ teamName: req.body.teamName?.trim(), emails, phones });
    res.json({ available: !hasConflicts(conflicts), conflicts });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/registrations/create-order
 * Body: { teamName, members: [ {name,email,phone,college,department?,year?,rollNo?}, {...} ] }
 * members[0] is the leader (the person paying).
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { errors, data } = validateRegistration(req.body, TEAM_SIZE);
    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const { teamName, members } = data;
    const conflicts = await findConflicts({
      teamName,
      emails: members.map((m) => m.email),
      phones: members.map((m) => m.phone),
    });
    if (hasConflicts(conflicts)) {
      return res.status(409).json({ message: 'Already registered', conflicts });
    }

    // Soft cap (UX only): confirmed teams + teams currently in checkout. The real
    // guarantee is the counter in confirmRegistration.
    const { open } = await capacity.getAvailability();
    if (!open) {
      return res.status(409).json({ code: 'SOLD_OUT', message: 'Registrations are full' });
    }

    const amount = FEE_PER_PERSON_PAISE * TEAM_SIZE;
    const expiresAt = new Date(Date.now() + PENDING_TTL_MS);

    // 1. Pending team
    const registration = await Registration.create({
      teamName,
      teamSize: TEAM_SIZE,
      amount,
      currency: 'INR',
      status: 'pending',
      expiresAt,
    });

    const people = await Participant.insertMany(
      members.map((m, i) => ({
        ...m,
        role: i === 0 ? 'leader' : 'member',
        registration: registration._id,
        status: 'pending',
        expiresAt,
      }))
    );
    registration.leader = people[0]._id;
    registration.members = people.map((p) => p._id);
    await registration.save();

    // 3. Razorpay order
    const receipt = registration._id.toString();
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        registrationId: receipt,
        teamName,
        leaderEmail: members[0].email,
        // Informational: after this the seat is no longer held, and a late payment may be refunded
        seatHeldUntil: new Date(registration.createdAt.getTime() + capacity.HOLD_MS).toISOString(),
      },
    });

    await Payment.create({
      registration: registration._id,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt,
      status: 'created',
    });

    res.status(201).json({
      registrationId: registration._id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      prefill: { name: members[0].name, email: members[0].email, contact: members[0].phone },
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment fields' });
    }

    if (!isValidCheckoutSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) return res.status(404).json({ message: 'Order not found' });

    let rp = await razorpay.payments.fetch(paymentId);
    if (rp.order_id !== orderId || Number(rp.amount) !== payment.amount) {
      return res.status(400).json({ message: 'Payment does not match order' });
    }
    if (rp.status === 'authorized') {
      rp = await razorpay.payments.capture(paymentId, payment.amount, payment.currency);
    }
    if (rp.status !== 'captured') {
      return res.status(400).json({ message: `Payment not completed (status: ${rp.status})` });
    }

    const result = await confirmRegistration({ orderId, paymentId, signature, method: rp.method, via: 'checkout' });

    switch (result.outcome) {
      case 'confirmed':
      case 'already_confirmed':
        return res.json({
          success: true,
          registrationId: result.registration._id,
          regCode: result.registration.regCode,
          teamName: result.registration.teamName,
        });
      case 'conflict':
        return res.status(409).json({
          success: false,
          message: `Payment received, but this ${result.field} was registered by another team meanwhile. Your refund will be processed.`,
        });
      case 'sold_out':
        return res.status(409).json({
          success: false,
          code: 'SOLD_OUT',
          message: 'Payment received but the event filled up. Your refund will be processed.',
        });
      case 'registration_missing':
        return res.status(410).json({
          success: false,
          message: 'Payment received but the registration session expired. Please contact the organisers.',
        });
      default:
        return res.status(404).json({ success: false, message: 'Order not found' });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/registrations/availability
 * { capacity, confirmed, onHold, remaining, open }
 */
exports.getAvailability = async (req, res, next) => {
  try {
    res.json(await capacity.getAvailability());
  } catch (err) {
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const reg = await Registration.findById(req.params.id)
      .select('teamName status regCode confirmedAt members')
      .populate('members', 'name role')
      .lean();
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    res.json({
      teamName: reg.teamName,
      status: reg.status,
      regCode: reg.regCode || null,
      confirmedAt: reg.confirmedAt || null,
      members: reg.members.map((m) => ({ name: m.name, role: m.role })),
    });
  } catch (err) {
    next(err);
  }
};
