const { Schema, model, Types } = require('mongoose');

// One document per Razorpay ORDER. Never TTL-deleted: this is your money trail.
const paymentSchema = new Schema(
  {
    registration: { type: Types.ObjectId, ref: 'Registration', required: true, index: true },

    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    razorpaySignature: String,

    amount: { type: Number, required: true }, // paise
    currency: { type: String, default: 'INR' },
    receipt: String,

    status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created', index: true },
    method: String, // upi / card / netbanking ...
    verifiedVia: { type: String, enum: ['checkout', 'webhook'] },
    failureReason: String,
    paidAt: Date,

    // Set when money was received but the team could not be confirmed (duplicate email, expired, etc.)
    needsReview: { type: Boolean, default: false, index: true },
    note: String,
  },
  { timestamps: true }
);

module.exports = model('Payment', paymentSchema);
