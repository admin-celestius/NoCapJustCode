const { Schema, model, Types } = require('mongoose');

// One document per PERSON. A team of 2 => 2 Participant docs.
const participantSchema = new Schema(
  {
    registration: { type: Types.ObjectId, ref: 'Registration', required: true, index: true },
    role: { type: String, enum: ['leader', 'member'], required: true },

    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true }, // 10-digit Indian mobile
    department: { type: String, trim: true },
    year: { type: Number, min: 1, max: 5 },
    rollNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 60 },

    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending', index: true },

    checkedIn: { type: Boolean, default: false },
    checkedInAt: Date,

    expiresAt: Date,
  },
  { timestamps: true }
);

participantSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);
participantSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);
participantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// reg_number in the registration UI maps to the existing rollNo field.
participantSchema.index(
  { rollNo: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' }, collation: { locale: 'en', strength: 2 } }
);

module.exports = model('Participant', participantSchema);
