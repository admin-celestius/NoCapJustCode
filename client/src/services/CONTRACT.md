# Registration API contract

All requests use `VITE_API_URL` (the backend origin) and JSON. There is no mock fallback, `/api/register` endpoint, frontend payment secret, or active webhook route.

| Request | Consumer | Result |
| --- | --- | --- |
| `GET /health` | App startup | `200 { ok: true }` while MongoDB is connected; otherwise 503 |
| `POST /api/registrations/create-order` | Registration modal | Validates and persists a pending pair, creates Razorpay order |
| `POST /api/registrations/verify-payment` | Checkout handler / verification retry | Verifies captured payment and transactionally confirms the pair |
| `POST /api/registrations/check` | Optional API client; not needed by the modal | Checks confirmed email/phone/roll-number/team conflicts |
| `GET /api/registrations/availability` | Optional API client | Team capacity, confirmed teams, temporary holds, remaining teams, open |
| `GET /api/registrations/:id/status` | Optional API client / support | Team status, code, confirmation time, member names/roles |

## Create order

```json
{
  "teamName": "Runtime Terrors",
  "members": [
    { "name": "Test Player One", "email": "one@example.com", "phone": "9000000001", "department": "CSE", "year": 3, "rollNo": "TEST001" },
    { "name": "Test Player Two", "email": "two@example.com", "phone": "9000000002", "department": "CSE", "year": 3, "rollNo": "TEST002" }
  ]
}
```

The modal maps `pairName` → `teamName`, `fullName` → `name`, and converts year to a number. The registration number (`reg_number` concept) is stored as the existing `rollNo` field. Registration is limited to CIT students. Both members need every listed field. Names: 2–100 characters; team: 2–60; department: 2–100; rollNo: 1–60; integer year: 1–5. Email and phone are normalized; registration numbers are trimmed/uppercased. Emails, phones and registration numbers must differ within a pair. Confirmed email, phone, rollNo and team names are unique. Pending duplicates can reach Checkout, but only one can confirm.

`201` returns `{ registrationId, orderId, amount: 30726, currency: "INR", keyId, prefill, checkoutTimeout }`. Amount is always computed server-side (₹298 + taxes = 30726 paise). This is NOT registration success.

## Verify payment

Send `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` from Checkout. The backend validates the HMAC against its stored order ID, fetches payment details, checks ID/order/amount/currency, captures an authorized payment when needed, and requires captured status.

`200` returns `{ success: true, registrationId, regCode, teamName }` only after MongoDB confirmation. Repeat verification returns the same code and consumes no extra seat. The client also requires the success flag and both IDs before showing its success screen.

## Errors and state

- `400 { message, errors: [{ field, message }] }`: invalid input; dotted paths map to form fields.
- `409 { code: "DUPLICATE_REGISTRATION", message, conflicts: { emails, phones, rollNos, teamName } }`: already confirmed details.
- `409 { code: "SOLD_OUT", message }`: no capacity; if payment was received, the message explicitly says so and directs the user to organisers.
- `409/410 { success: false, code: "PAYMENT_REVIEW", message }`: captured payment needs manual review/refund, not another payment.
- `502 { message }`: gateway failure. Other server/network failures remain errors, never mock success.

A failed verification retains the signed callback in memory/sessionStorage and offers **Retry Payment Verification**, including after reload in the same tab. Successful confirmation clears that recovery record. Cancellation/failure retains the form and reuses its pending order if the details have not changed. Holds expire after `HOLD_MINUTES`; unpaid attempts never acquire confirmed seats.

Availability uses teams, not people: `{ capacity: 30, confirmed: 0, onHold: 0, remaining: 30, open: true }`. `/check` accepts `{ teamName?, emails?: [], phones?: [], rollNos?: [] }` (at most two of each) and returns `{ available, conflicts }`.
