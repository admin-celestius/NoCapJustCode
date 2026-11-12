const { Schema, model } = require('mongoose');

// Single document (key: 'main') holding the confirmed-team counter and admin event flags.
// The counter is $inc'd inside the confirmation transaction, which is what
// makes the MAX_TEAMS cap impossible to exceed under concurrent payments.
const eventConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    confirmedCount: { type: Number, default: 0, min: 0 },
    promoActive: { type: Boolean, default: true },
    registrationsClosed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model('EventConfig', eventConfigSchema);
