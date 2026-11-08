const crypto = require('crypto');

const hmacHex = (secret, payload) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

// Constant-time compare so the signature can't be guessed byte-by-byte
const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

// Checkout signature = HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)
const isValidCheckoutSignature = (orderId, paymentId, signature) =>
  safeEqual(hmacHex(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);

// Webhook signature = HMAC_SHA256(raw request body, WEBHOOK_SECRET)
const isValidWebhookSignature = (rawBody, signature) =>
  safeEqual(hmacHex(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);

module.exports = { isValidCheckoutSignature, isValidWebhookSignature };
