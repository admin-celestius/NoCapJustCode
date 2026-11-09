const { Schema, model, Types } = require('mongoose');

// One document per TEAM (the thing that gets paid for).
const registrationSchema = new Schema(
  {
    regCode: { type: String, unique: true, sparse: true }, // e.g. TEAM-3F9A1C, assigned after payment
    teamName: { type: String, required: true, trim: true, maxlength: 60 },

    leader: { type: Types.ObjectId, ref: 'Participant' }, // the person who filled the form and paid
    members: [{ type: Types.ObjectId, ref: 'Participant' }], // both participants (leader included)
    teamSize: { type: Number, default: 2 },

    amount: { type: Number, required: true }, // in paise, always computed on the server
    currency: { type: String, default: 'INR' },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'refund_required'],
      default: 'pending',
      index: true,
    },
    payment: { type: Types.ObjectId, ref: 'Payment' }, // the successful payment
    confirmedAt: Date,

    attendance: {
      round1: {
        attended: { type: Boolean, default: false },
        markedAt: Date,
        markedBy: { type: String, trim: true },
      },
      round2: {
        attended: { type: Boolean, default: false },
        markedAt: Date,
        markedBy: { type: String, trim: true },
      },
    },

    expiresAt: Date, // TTL for abandoned pending registrations
  },
  { timestamps: true }
);

// Team names unique (case-insensitive) among confirmed teams only
registrationSchema.index(
  { teamName: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'confirmed' },
    collation: { locale: 'en', strength: 2 },
  }
);
registrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('Registration', registrationSchema);
