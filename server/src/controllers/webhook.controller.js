const Payment = require('../models/Payment');
const { isValidWebhookSignature } = require('../utils/signature');
const { confirmRegistration } = require('../services/confirmRegistration');

exports.razorpayWebhook = async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  if (!Buffer.isBuffer(req.body) || !isValidWebhookSignature(req.body, signature)) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ message: 'Bad JSON' });
  }

  try {
    const p = event.payload?.payment?.entity;

    switch (event.event) {
      case 'order.paid':
      case 'payment.captured':
        if (p?.order_id) {
          const result = await confirmRegistration({
            orderId: p.order_id,
            paymentId: p.id,
            method: p.method,
            via: 'webhook',
          });
          console.log(`[webhook] ${event.event} ${p.order_id} -> ${result.outcome}`);
          if (result.outcome === 'sold_out') {
            console.warn(`[webhook] event full: order ${p.order_id} (payment ${p.id}) was paid but not confirmed; refund required`);
          }
        }
        break;

      case 'payment.failed':
        if (p?.order_id) {
          await Payment.updateOne(
            { razorpayOrderId: p.order_id, status: { $ne: 'paid' } },
            { $set: { status: 'failed', failureReason: p.error_description || p.error_reason } }
          );
        }
        break;

      default:
        break; 
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('[webhook] error', err);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};
