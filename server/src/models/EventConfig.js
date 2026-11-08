const { Schema, model } = require('mongoose');

// Single document (key: 'main') holding the confirmed-team counter.
// The counter is $inc'd inside the confirmation transaction, which is what
// makes the MAX_TEAMS cap impossible to exceed under concurrent payments.
const eventConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    confirmedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = model('EventConfig', eventConfigSchema);
