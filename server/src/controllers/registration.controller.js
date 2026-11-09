const mongoose = require('mongoose');
const { isValidObjectId } = mongoose;
const razorpay = require('../config/razorpay');
const Registration = require('../models/Registration');
const Participant = require('../models/Participant');
const Payment = require('../models/Payment');
const { validateRegistration, checkSchema, paymentSchema, issues } = require('../utils/validate');
const { isValidCheckoutSignature } = require('../utils/signature');
const { confirmRegistration } = require('../services/confirmRegistration');
const capacity = require('../services/capacity');

const TEAM_SIZE = 2;
const FEE_PER_PERSON_PAISE = Math.round(Number(process.env.FEE_PER_PERSON_INR || 149) * 100);
if (FEE_PER_PERSON_PAISE !== 14900) throw new Error('FEE_PER_PERSON_INR must be 149 for this event');
// Charged per pair: ₹298 + taxes (Razorpay gateway fees passed on).
const ORDER_AMOUNT_PAISE = 30726;
const PENDING_TTL_MS = 24 * 60 * 60 * 1000; 
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

async function findConflicts({ teamName, emails = [], phones = [], rollNos = [] }) {
  const [people, team] = await Promise.all([
    Participant.find(
      { status: 'confirmed', $or: [{ email: { $in: emails } }, { phone: { $in: phones } }, { rollNo: { $in: rollNos } }] },
      'email phone rollNo'
    ).collation(CASE_INSENSITIVE).lean(),
    teamName
      ? Registration.findOne({ status: 'confirmed', teamName }).collation(CASE_INSENSITIVE).select('_id').lean()
      : null,
  ]);
  return {
    emails: people.map((p) => p.email).filter((e) => emails.includes(e)),
    phones: people.map((p) => p.phone).filter((p) => phones.includes(p)),
    rollNos: people.map((p) => p.rollNo?.toUpperCase()).filter((p) => rollNos.includes(p)),
    teamName: Boolean(team),
  };
}

const hasConflicts = (c) => c.emails.length || c.phones.length || c.rollNos.length || c.teamName;


/**
 * GET /api/registrations/check-team?name=RuntimeTerrors
 * Checks whether a duo codename is unique/available among confirmed registrations.
 */
exports.checkTeamName = async (req, res, next) => {
  try {
    const rawName = (req.query.name || req.query.teamName || req.body?.name || req.body?.teamName || '').trim();
    if (!rawName || rawName.length < 2) {
      return res.status(400).json({
        available: false,
        message: 'Duo codename must be at least 2 characters',
      });
    }
    if (rawName.length > 60) {
      return res.status(400).json({
        available: false,
        message: 'Duo codename cannot exceed 60 characters',
      });
    }

    const existing = await Registration.findOne({
      status: 'confirmed',
      teamName: rawName,
    })
      .collation(CASE_INSENSITIVE)
      .select('_id')
      .lean();

    const available = !existing;
    return res.json({
      available,
      teamName: rawName,
      message: available ? 'Codename is available' : 'This duo codename is already taken',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/registrations/:code/verify
 * Public verification endpoint when QR pass is scanned by Google Lens, Camera, or browser.
 */
exports.getPublicVerification = async (req, res, next) => {
  try {
    const rawCode = (req.params.code || '').trim().toUpperCase();
    if (!rawCode) {
      return res.status(400).json({ valid: false, message: 'Invalid registration code.' });
    }

    const reg = await Registration.findOne({ regCode: rawCode, status: 'confirmed' })
      .select('regCode teamName status confirmedAt members attendance')
      .populate('members', 'name role department year')
      .lean();

    if (!reg) {
      return res.status(404).json({
        valid: false,
        message: 'No confirmed entry pass found.',
      });
    }

    const memberList = (reg.members || []).map((m) => ({
      name: m.name,
      role: m.role || 'member',
      department: m.department || '',
    }));

    return res.json({
      valid: true,
      eventName: 'LARPER OR CODER',
      edition: '2026',
      presentedBy: 'Celestius',
      venue: 'CIT Campus',
      regCode: reg.regCode,
      teamName: reg.teamName,
      status: 'CONFIRMED',
      confirmedAt: reg.confirmedAt,
      members: memberList,
      attendance: {
        workshop: reg.attendance?.workshop || reg.attendance?.round1 || { attended: false },
        competition: reg.attendance?.competition || reg.attendance?.round2 || { attended: false },
        round1: reg.attendance?.workshop || reg.attendance?.round1 || { attended: false },
        round2: reg.attendance?.competition || reg.attendance?.round2 || { attended: false },
      },
      message: 'Official Entry Pass Verified. This duo is officially confirmed by Celestius for LARPER OR CODER.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/registrations/admin/verify-passkey
 * Validates the 6-digit organiser security passkey.
 */
exports.verifyPasskey = async (req, res) => {
  const passcode = (req.body?.passcode || req.headers['x-organiser-passcode'] || '').trim();
  const expectedPasscode = (process.env.ORGANISER_PASSCODE || '849201').trim();
  if (passcode && passcode === expectedPasscode) {
    return res.json({ success: true, message: 'Security passkey authenticated.' });
  }
  return res.status(401).json({ success: false, message: 'Invalid 6-digit security passkey.' });
};

/**
 * POST /api/registrations/:code/checkin
 * Protected check-in endpoint for event organisers to mark attendance for Workshop & Competition.
 */
exports.markAttendance = async (req, res, next) => {
  try {
    const passcode = (req.headers['x-organiser-passcode'] || req.body?.passcode || '').trim();
    const expectedPasscode = (process.env.ORGANISER_PASSCODE || '849201').trim();

    if (!passcode || passcode !== expectedPasscode) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Invalid organiser passcode.',
      });
    }

    const rawCode = (req.params.code || '').trim().toUpperCase();
    const rawRound = (req.body?.round || '').trim().toLowerCase();
    let targetRound = rawRound;
    if (rawRound === 'round1') targetRound = 'workshop';
    if (rawRound === 'round2') targetRound = 'competition';

    if (!['workshop', 'competition'].includes(targetRound)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid round specified. Must be "workshop" or "competition".',
      });
    }

    const markedBy = (req.body?.markedBy || 'Organiser Desk').trim();

    const reg = await Registration.findOne({ regCode: rawCode, status: 'confirmed' })
      .populate('members', 'name role');

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'No confirmed registration found for this code.',
      });
    }

    if (!reg.attendance) {
      reg.attendance = {
        workshop: { attended: false },
        competition: { attended: false },
      };
    }

    const roundName = targetRound === 'workshop' ? 'The Training Arc (Workshop)' : 'TLE (Competition)';
    const roundAttendance =
      reg.attendance[targetRound] ||
      (targetRound === 'workshop' ? reg.attendance.round1 : reg.attendance.round2);

    if (roundAttendance?.attended) {
      const timeStr = roundAttendance.markedAt
        ? new Date(roundAttendance.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'earlier';
      return res.status(409).json({
        success: false,
        alreadyCheckedIn: true,
        message: `Attendance for ${roundName} has already been marked at ${timeStr}.`,
        attendance: {
          workshop: reg.attendance.workshop || reg.attendance.round1 || { attended: false },
          competition: reg.attendance.competition || reg.attendance.round2 || { attended: false },
          round1: reg.attendance.workshop || reg.attendance.round1 || { attended: false },
          round2: reg.attendance.competition || reg.attendance.round2 || { attended: false },
        },
        regCode: reg.regCode,
        teamName: reg.teamName,
        members: reg.members.map((m) => ({ name: m.name, role: m.role })),
      });
    }

    const attendanceRecord = {
      attended: true,
      markedAt: new Date(),
      markedBy,
    };

    reg.attendance[targetRound] = attendanceRecord;
    // Maintain legacy aliases
    if (targetRound === 'workshop') {
      reg.attendance.round1 = attendanceRecord;
    } else if (targetRound === 'competition') {
      reg.attendance.round2 = attendanceRecord;
    }

    reg.markModified('attendance');
    await reg.save();

    return res.json({
      success: true,
      message: `Check-in recorded successfully for ${roundName}.`,
      attendance: {
        workshop: reg.attendance.workshop,
        competition: reg.attendance.competition,
        round1: reg.attendance.workshop,
        round2: reg.attendance.competition,
      },
      regCode: reg.regCode,
      teamName: reg.teamName,
      members: reg.members.map((m) => ({ name: m.name, role: m.role })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/registrations/admin/roster
 * GET /api/registrations/admin/roster
 * Protected endpoint returning list of confirmed teams with workshop & competition attendance status.
 */
exports.getAttendanceRoster = async (req, res, next) => {
  try {
    const passcode = (req.headers['x-organiser-passcode'] || req.body?.passcode || req.query?.passcode || '').trim();
    const expectedPasscode = (process.env.ORGANISER_PASSCODE || '849201').trim();

    if (!passcode || passcode !== expectedPasscode) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Invalid organiser passcode.',
      });
    }

    const registrations = await Registration.find({ status: 'confirmed' })
      .populate('members', 'name role email phone rollNo department')
      .sort({ confirmedAt: 1, createdAt: 1 })
      .lean();

    const teams = registrations.map((reg) => {
      const mem1 = reg.members?.[0];
      const mem2 = reg.members?.[1];

      const workshopAttended = Boolean(
        reg.attendance?.workshop?.attended || reg.attendance?.round1?.attended
      );
      const competitionAttended = Boolean(
        reg.attendance?.competition?.attended || reg.attendance?.round2?.attended
      );

      return {
        regCode: reg.regCode || 'PENDING',
        teamName: reg.teamName,
        mem1Name: mem1?.name || 'N/A',
        mem2Name: mem2?.name || 'N/A',
        workshopStatus: workshopAttended ? 'attended' : 'not_attended',
        competitionStatus: competitionAttended ? 'attended' : 'not_attended',
        workshopMarkedAt: reg.attendance?.workshop?.markedAt || reg.attendance?.round1?.markedAt || null,
        competitionMarkedAt: reg.attendance?.competition?.markedAt || reg.attendance?.round2?.markedAt || null,
      };
    });

    return res.json({
      success: true,
      totalTeams: teams.length,
      workshopAttendedCount: teams.filter((t) => t.workshopStatus === 'attended').length,
      competitionAttendedCount: teams.filter((t) => t.competitionStatus === 'attended').length,
      teams,
    });
  } catch (err) {
    next(err);
  }
};

exports.checkAvailability = async (req, res, next) => {
  try {
    const parsed = checkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: issues(parsed.error) });
    const conflicts = await findConflicts(parsed.data);
    res.json({ available: !hasConflicts(conflicts), conflicts });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/registrations/create-order
 * Body: { teamName, members: [ {name,email,phone,department,year,rollNo}, {...} ] }
 * members[0] is the leader (the person paying).
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { errors, data } = validateRegistration(req.body);
    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const { teamName, members } = data;
    const conflicts = await findConflicts({
      teamName,
      emails: members.map((m) => m.email),
      phones: members.map((m) => m.phone),
      rollNos: members.map((m) => m.rollNo),
    });
    if (hasConflicts(conflicts)) {
      return res.status(409).json({ code: 'DUPLICATE_REGISTRATION', message: 'Already registered', conflicts });
    }

    // Soft cap (UX only): confirmed teams + teams currently in checkout. The real
    // guarantee is the counter in confirmRegistration.
    const { open } = await capacity.getAvailability();
    if (!open) {
      return res.status(409).json({ code: 'SOLD_OUT', message: 'Registrations are full' });
    }

    const amount = ORDER_AMOUNT_PAISE;
    const expiresAt = new Date(Date.now() + PENDING_TTL_MS);

    // Persist a complete pair atomically before creating an external order.
    let registration;
    await mongoose.connection.transaction(async (session) => {
      [registration] = await Registration.create([{
        teamName,
        teamSize: TEAM_SIZE,
        amount,
        currency: 'INR',
        status: 'pending',
        expiresAt,
      }], { session });

      const people = await Participant.insertMany(
        members.map((m, i) => ({
          ...m,
          role: i === 0 ? 'leader' : 'member',
          registration: registration._id,
          status: 'pending',
          expiresAt,
        })), { session }
      );
      registration.leader = people[0]._id;
      registration.members = people.map((p) => p._id);
      await registration.save({ session });
    });

    // Gateway calls stay outside transactions (MongoDB can retry callbacks).
    try {
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
        checkoutTimeout: capacity.HOLD_MINUTES > 0 ? capacity.HOLD_MINUTES * 60 : 900,
      });
    } catch (err) {
      await mongoose.connection.transaction(async (session) => {
        await Participant.deleteMany({ registration: registration._id, status: 'pending' }, { session });
        await Registration.deleteOne({ _id: registration._id, status: 'pending' }, { session });
      });
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid payment fields', errors: issues(parsed.error) });
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = parsed.data;

    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) return res.status(404).json({ message: 'Order not found' });

    if (!isValidCheckoutSignature(payment.razorpayOrderId, paymentId, signature)) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    let rp = await razorpay.payments.fetch(paymentId);
    const matchesOrder = (p) => p.id === paymentId && p.order_id === payment.razorpayOrderId &&
      Number(p.amount) === payment.amount && p.currency === payment.currency;
    if (!matchesOrder(rp)) {
      return res.status(400).json({ message: 'Payment does not match order' });
    }
    if (rp.status === 'authorized') {
      try {
        rp = await razorpay.payments.capture(paymentId, payment.amount, payment.currency);
      } catch (err) {
        // An auto-capture or parallel verification may have captured it already.
        rp = await razorpay.payments.fetch(paymentId);
        if (rp.status !== 'captured') throw err;
      }
    }
    if (!matchesOrder(rp) || rp.status !== 'captured') {
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
          members: (await Participant.find({ registration: result.registration._id }).select('name role department year').lean() || []).map((m) => ({ name: m.name, role: m.role })),
        });
      case 'conflict':
        return res.status(409).json({
          success: false,
          code: 'PAYMENT_REVIEW',
          message: `Payment received, but this ${result.field} was registered by another team meanwhile. Contact the organisers for a refund; do not pay again.`,
        });
      case 'sold_out':
        return res.status(409).json({
          success: false,
          code: 'SOLD_OUT',
          message: 'Payment received but the event filled up. Contact the organisers for a refund; do not pay again.',
        });
      case 'registration_missing':
      case 'registration_incomplete':
        return res.status(410).json({
          success: false,
          code: 'PAYMENT_REVIEW',
          message: 'Payment received but the registration session expired or is incomplete. Contact the organisers; do not pay again.',
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
