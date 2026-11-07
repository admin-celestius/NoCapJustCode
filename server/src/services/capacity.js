const Registration = require('../models/Registration');
const EventConfig = require('../models/EventConfig');

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer (got "${raw}")`);
  return n;
}

// Max confirmed teams. Enforced for real in confirmRegistration via EventConfig.
const MAX_TEAMS = intFromEnv('MAX_TEAMS', 50);
// How long a pending registration "holds" a seat while its owner is in Razorpay Checkout.
// Only used for the soft check / availability; the 24h TTL is separate and unchanged.
const HOLD_MINUTES = intFromEnv('HOLD_MINUTES', 15);
const HOLD_MS = HOLD_MINUTES * 60 * 1000;

const CONFIG_KEY = 'main';

// Seats are counted from the Registration collection, not from EventConfig,
// so abandoned attempts free their seat HOLD_MINUTES after they were created.
async function getAvailability() {
  const holdSince = new Date(Date.now() - HOLD_MS);
  const [confirmed, onHold] = await Promise.all([
    Registration.countDocuments({ status: 'confirmed' }),
    HOLD_MS > 0 ? Registration.countDocuments({ status: 'pending', createdAt: { $gt: holdSince } }) : 0,
  ]);
  const remaining = Math.max(0, MAX_TEAMS - confirmed - onHold);
  return { capacity: MAX_TEAMS, confirmed, onHold, remaining, open: remaining > 0 };
}

// Creates the counter document if it doesn't exist yet, seeded from the real number
// of confirmed teams. Runs outside the transaction so the collection never has to be
// created inside one. Safe to race: every confirmation calls this before it can $inc,
// so nothing can be confirmed between the count and the insert without the doc existing.
async function ensureEventConfig() {
  if (await EventConfig.exists({ key: CONFIG_KEY })) return;
  const confirmed = await Registration.countDocuments({ status: 'confirmed' });
  try {
    await EventConfig.updateOne(
      { key: CONFIG_KEY },
      { $setOnInsert: { confirmedCount: confirmed } },
      { upsert: true }
    );
  } catch (err) {
    if (err.code !== 11000) throw err; // another request created it first
  }
}

// Atomically takes one seat. Must be called with the confirmation transaction's session:
// two concurrent claims write the same document, so one of them hits a write conflict and
// is retried by withTransaction, by which point it sees the updated count.
// Returns null when the event is full.
function claimSeat(session) {
  return EventConfig.findOneAndUpdate(
    { key: CONFIG_KEY, confirmedCount: { $lt: MAX_TEAMS } },
    { $inc: { confirmedCount: 1 } },
    { new: true, session }
  );
}

module.exports = { MAX_TEAMS, HOLD_MINUTES, HOLD_MS, CONFIG_KEY, getAvailability, ensureEventConfig, claimSeat };
