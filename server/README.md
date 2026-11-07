# Event registration backend (team of 2, Razorpay)

```
npm install
cp .env.example .env   # fill in keys
npm run dev
```

## Payment flow

1. Form submit → `POST /api/registrations/create-order` → creates a pending team, 2 pending participants and a Razorpay order.
2. Frontend opens Razorpay Checkout with the returned `orderId`.
3. Checkout success handler → `POST /api/registrations/verify-payment` → signature check, payment re-fetched from Razorpay, team and both people marked `confirmed`, `regCode` returned.
4. Razorpay also calls `POST /api/payments/webhook` (`order.paid`). If the user closed the tab before step 3, this still confirms the team. Both paths are idempotent.
5. Unpaid attempts are removed automatically after 24h (TTL index).

## Environment variables

See `.env.example`. Capacity-related:

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAX_TEAMS` | `50` | Maximum number of **confirmed** teams. |
| `HOLD_MINUTES` | `15` | How long a pending registration holds a seat while its owner is in Razorpay Checkout. `0` disables holds. |

## Registration cap

- **Soft check (create-order):** seats taken = confirmed teams + pending teams created in the last `HOLD_MINUTES`. If that reaches `MAX_TEAMS`, `create-order` returns `409 { code: 'SOLD_OUT', message: 'Registrations are full' }` and nothing is created. An abandoned checkout frees its seat after `HOLD_MINUTES`, not after the 24h TTL.
- **Hard cap (confirmation):** an `EventConfig` document (`key: 'main'`) holds `confirmedCount`. It is created on first use and seeded from the real number of confirmed teams. The counter is incremented with `confirmedCount < MAX_TEAMS` inside the confirmation transaction, so two payments racing for the last seat can't both be confirmed. If the transaction aborts, for example on a duplicate email, the increment rolls back.
- **Paid but full:** the team becomes `refund_required`, both participants `cancelled`, and the Payment is `paid` + `needsReview` with note `Event full at confirmation; refund required`. Refund these from the Razorpay dashboard (`Payment.find({ needsReview: true })`). `verify-payment` returns `409 { success: false, code: 'SOLD_OUT', message }`; the webhook logs it and returns 200.
- Razorpay orders carry `notes.seatHeldUntil`. To stop people paying after their hold ends, set the Checkout option `timeout: HOLD_MINUTES * 60` (seconds) on the frontend.
- If you raise `MAX_TEAMS` later, restart the server. The counter keeps its value and the new limit applies straight away. Lowering it below the confirmed count only stops new confirmations.

### `GET /api/registrations/availability`

```json
{ "capacity": 50, "confirmed": 47, "onHold": 2, "remaining": 1, "open": true }
```

`remaining = max(0, capacity - confirmed - onHold)`, `open = remaining > 0`. Public. Use it to show "N spots left" or to disable the form.

### Testing the cap

`scripts/test-cap.js` runs the real routes against a separate database (`TEST_DB_NAME`, default `cap_test`, **wiped on each run**) with `MAX_TEAMS=2`. It stubs only the Razorpay API client and signs webhooks with `RAZORPAY_WEBHOOK_SECRET` (HMAC-SHA256 of the raw body in `x-razorpay-signature`). It checks the soft check and hold expiry, sequential webhooks (teams 1 and 2 confirmed, team 3 `refund_required`), replays, `verify-payment` when full, ten rounds of two concurrent webhooks for the last seat (exactly one must confirm), and the counter rollback on an aborted transaction.

It needs a replica set. A throwaway local one:

```
mkdir -p /tmp/rs && mongod --replSet rs0 --port 27031 --dbpath /tmp/rs --fork --logpath /tmp/rs.log
mongosh --port 27031 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27031"}]})'
TEST_MONGO_URI='mongodb://127.0.0.1:27031/?replicaSet=rs0' node scripts/test-cap.js
```

Against a running server you can fire a signed webhook by hand:

```
BODY='{"event":"order.paid","payload":{"payment":{"entity":{"id":"pay_X","order_id":"<orderId from create-order>","method":"upi"}}}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$RAZORPAY_WEBHOOK_SECRET" -hex | sed 's/^.* //')
curl -X POST localhost:5000/api/payments/webhook -H 'Content-Type: application/json' -H "x-razorpay-signature: $SIG" -d "$BODY"
curl localhost:5000/api/registrations/availability
```

## Frontend (React) sketch

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

```js
const res = await fetch(`${API}/api/registrations/create-order`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ teamName, members: [leader, partner] }),
});
const order = await res.json();
if (!res.ok) return showError(order);

const rzp = new window.Razorpay({
  key: order.keyId,
  amount: order.amount,
  currency: order.currency,
  order_id: order.orderId,
  name: 'Event Name',
  description: 'Team registration (2 people)',
  prefill: order.prefill,
  handler: async (resp) => {
    // resp = { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    const v = await fetch(`${API}/api/registrations/verify-payment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resp),
    }).then((r) => r.json());
    v.success ? goToSuccess(v.regCode) : showError(v.message);
  },
  modal: { ondismiss: () => console.log('Checkout closed') },
});
rzp.open();
```

## Testing webhooks locally
Expose the server with ngrok or cloudflared and set the webhook URL to `https://<tunnel>/api/payments/webhook` in the Razorpay **test mode** dashboard.
