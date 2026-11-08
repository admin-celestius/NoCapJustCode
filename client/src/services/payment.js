let checkoutScript;

export function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScript) return checkoutScript;
  checkoutScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      checkoutScript = undefined;
      reject(new Error("Payment Didn't Cook. Checkout could not load. Check your connection and retry."));
    };
    const timer = setTimeout(fail, 15000);
    script.onerror = fail;
    script.onload = () => {
      if (!window.Razorpay) return fail();
      clearTimeout(timer);
      resolve();
    };
    document.head.appendChild(script);
  });
  return checkoutScript;
}

// Resolves only with signed Checkout details. The caller must verify them on the server.
export async function startPayment(order) {
  await loadCheckout();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    const checkout = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'LARPER OR CODER',
      description: 'Duo registration · The Training Arc & TLE',
      prefill: order.prefill,
      timeout: order.checkoutTimeout || 900,
      theme: { color: '#F26B3A' },
      retry: { enabled: false },
      handler: (response) => finish(resolve, response),
      modal: {
        ondismiss: () => finish(reject, Object.assign(new Error("Payment Didn't Cook. Checkout was closed. Your duo is not confirmed; you can retry."), { code: 'PAYMENT_CANCELLED' })),
      },
    });
    checkout.on('payment.failed', (response) => {
      finish(reject, Object.assign(new Error(`Payment Didn't Cook. ${response.error?.description || 'Please retry Checkout.'}`), { code: 'PAYMENT_FAILED' }));
      checkout.close();
    });
    checkout.open();
  });
}

// Keep only the signed callback, never participant data or secrets. Reloads can retry
// server verification without launching another payment. Storage may be unavailable.
const RECOVERY_KEY = 'loc-payment-verification';
export function readPendingPayment() {
  try {
    const data = JSON.parse(sessionStorage.getItem(RECOVERY_KEY));
    return data?.razorpay_order_id && data?.razorpay_payment_id && data?.razorpay_signature ? data : null;
  } catch { return null; }
}
export function savePendingPayment(data) {
  try {
    if (data) sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(data));
    else sessionStorage.removeItem(RECOVERY_KEY);
  } catch { /* Verification still works in memory when storage is blocked. */ }
}
