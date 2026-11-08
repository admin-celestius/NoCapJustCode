# Frontend–backend integration audit

Audit date: 8 November 2026. Event: **LARPER OR CODER**, Celestius.

## Integration status

The original frontend was **not functionally integrated**: it called a nonexistent route, silently generated mock registrations, and skipped payment. It is now connected to the real Express API and MongoDB transaction flow. Automated browser tests exercised the actual UI, API and database together; Razorpay Checkout and its network API were stubbed for those tests. A separate read-only request authenticated successfully with the configured Razorpay test credentials. Actual interactive Razorpay test-mode payment remains a manual release check.

The existing black/orange theme, official event names and unrelated user edits were preserved. Copy changes are limited to required fields and truthful payment/confirmation/error messages. Pricing is ₹149 each / ₹298 per duo.

## Architecture and working features preserved

- React 19 / Vite, CSS Modules, React Hook Form and frontend Zod. Hero/navbar/event CTAs open `RegisterModal` through `App`.
- Express entry point `server/src/server.js`, registration routes under `/api/registrations`; MongoDB/Mongoose models `Registration`, `Participant`, `Payment`, `EventConfig`.
- Existing pending → paid/confirmed lifecycle, 24-hour pending TTL, email/phone/team uniqueness, registration code, constant-time signature comparison, Razorpay fetch/capture, and transaction-based capacity counter.
- No authentication/admin interface exists. Public registration routes accept validated details; confirmation requires valid payment proof plus a server-side gateway check. Unused admin/token settings in the old root `.env` do not implement authorization.

## Problems found and fixes applied

| Problem | Fix / files |
| --- | --- |
| Nonexistent `/api/register`, missing API configuration and silent mock success on 404/offline | Replaced adapter with explicit create-order/verify-payment requests and structured errors in `client/src/services/api.js`; removed unused `mockApi.js`; added `client/.env.example` and local API configuration |
| Payment seam returned `skipped`; UI displayed success without payment | Implemented Checkout loading, cancellation/failure handling, signed callback recovery in `payment.js`; modal now gates success on verified server response |
| `pairName`/`fullName` payload did not match `teamName`/`name`; missing registration number; optional team name contradicted backend | Explicit payload mapping and required inputs/Zod validation in `RegisterModal.jsx` and `registrationSchema.js`; retains database field `rollNo` for the registration-number concept |
| Backend had handwritten validation, loose type coercion and no registration-number uniqueness | Added backend Zod in `utils/validate.js`, field errors, check/payment schemas; `Participant.rollNo` is required/normalized with a case-insensitive partial unique confirmed index; controller includes roll-number conflicts |
| Default capacity was 50 teams | `capacity.js` defaults to 30 and refuses values above 30; existing transactional counter retained |
| Local backend fee was ₹150, example blank and absent setting could charge zero | Local `server/.env` corrected to 149, example/default corrected; server refuses a configured price other than ₹149 |
| Non-atomic pending team creation and leftover holds after gateway failure | Pending team and both participants created transactionally; failed order setup removes only that pending attempt and releases its hold |
| Payment checks omitted currency; parallel capture could report a spurious failure | Controller validates payment ID, stored order, amount and currency before/after capture; re-fetches a capture race |
| Participant TTL deletion could leave an incomplete team that still confirmed | `confirmRegistration.js` verifies the full pair exists before claiming a seat; missing/partial paid attempts require review |
| Duplicate conflicts were marked outside a transaction; only sold-out decisions were stable on retries | Conflict marking is transactional and all terminal refund decisions remain stable; unknown duplicate-index failures are not misclassified as participant conflicts |
| Errors could be hidden above a long form | Modal scrolls server errors into view, preserves fields and prevents overlapping submissions |
| Broken backend dev script, cwd-dependent dotenv loading, no index readiness check | Fixed `package.json`; startup loads `server/.env` explicitly, checks transaction support and awaits indexes; `app.js` shares the real routes/CORS/error handling with tests |
| Existing active webhook path conflicted with requested checkout-only architecture | Active app does not mount a webhook route. Legacy source remains unmounted for reference; no webhook/trust-proxy infrastructure added |
| Existing cap test could fall back to configured database and depended on webhooks | Reworked test to require an explicit disposable loopback URI, generate its own database and exercise Checkout verification instead |
| Configured local MongoDB was standalone | Read-only audit confirmed this; with user approval, created a separate `locDev` replica set on port 27040, persisted under ignored `server/.local-mongo/`, and pointed local `server/.env` at it. Original database untouched |

Other changed files: API contract, server/client READMEs, `.gitignore`, dependency manifests/Yarn lockfiles, backend unit/integration/startup test helpers and Playwright config/tests. `Register.module.css` only adds fieldset-reset styles; no redesign.

## Registration verification

Actual path: modal Zod validation → mapped pair payload → backend Zod → confirmed-duplicate/soft-cap check → transaction creates pending `Registration` + two `Participant` records → Razorpay order + `Payment` → Checkout → verify-payment → MongoDB confirmation transaction → server registration code → success screen.

Tests verified both pending participants are stored, unpaid teams have zero confirmed seats, confirmed pairs have two participants, confirmation clears TTLs and status reads return the stored registration code. Same-pair and cross-team duplicate checks cover email, phone and registration number; confirmed team names are also unique. Database names were not changed to match UI copy.

## Payment verification

Orders use **29800 paise, INR**. The key secret stays in the backend. Signature verification uses the order ID loaded from the database; the server independently checks payment details and requires capture. The signed callback is saved in the current tab for retry after verification/network failure or reload, without opening another payment. Repeated verification does not create another confirmed registration or consume another seat.

Server-created orders and server-side signature verification follow Razorpay's [Standard Checkout integration documentation](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps). The optional webhook architecture described there is deliberately not used here.

## Capacity verification

**Maximum: 30 complete teams / 60 confirmed participants.** A conditional counter increment occurs in the same transaction as confirmation. Duplicate-index failures roll back that increment. The concurrency test sent 34 valid captured-payment confirmations and observed exactly 30 confirmed teams, 60 confirmed participants, and 4 refund-review cases. Replays kept the counter at 30.

Unpaid checkouts count only as temporary soft holds (15 minutes by default); they never consume confirmed seats. Holds are not a guaranteed reservation under concurrency. Expired-hold or simultaneous payments may therefore be captured after the event fills. The server refuses confirmation, retains the payment trail and asks the user to contact organisers. **Refunds require organiser action in Razorpay Dashboard.** No automated refund is claimed.

## Testing results

| Check | Result |
| --- | --- |
| Backend unit tests | 7 passed: schemas, normalization, malformed input, duplicates, signature, capacity/price configuration |
| Real HTTP/MongoDB integration suite | 13 scenarios passed, including actual entry-point startup, CORS/preflight, index enforcement, gateway failure cleanup, capture races, idempotency, TTL/partial-pair handling and 34 concurrent confirmations |
| Playwright browser suite | 7 passed: validation, real UI/API/database confirmation, cancellation/failure/order reuse, network/full-capacity/duplicate errors, verification retry after reload, mobile success gating |
| Frontend production build | Passed; existing-size warning for bundle over 500 kB remains |
| Frontend lint | Exit 0; two unrelated existing `set-state-in-effect` warnings in `Quote.jsx` and `GoatTerminalVisual.jsx` remain |
| Diff whitespace check | Passed |
| Original configured database | Read-only connectivity passed; transaction support absent; zero confirmed teams at audit time |
| New development database | Backend startup/health, transaction support and unique registration-number index verified |
| Razorpay account | Read-only test-key authentication passed; no order or payment created |
| Interactive Razorpay Checkout / production deployment | Not tested; exact manual steps below |

No real payments were triggered. Existing database records were not changed. All integration resets ran only in newly generated disposable test databases. The development replica set is separate and remains available for local use.

## Remaining release checks and manual steps

1. **Run the local application.** The new development MongoDB is already configured and running on port 27040. In separate terminals run `cd server && npm run dev` and `cd client && npm run dev`; open `http://localhost:5173`. After a reboot, restart the dev database using the command in `server/README.md`. Do not point the automated tests at this development database.
2. **Complete a real Razorpay test-mode checkout.** Keep `rzp_test_` keys in `server/.env`, use the separate development database, and enter two fictional participants with unique emails/phones/registration numbers. In browser Network, require `POST /api/registrations/create-order` → 201, `amount: 29800`, `currency: INR`. Complete Razorpay's test checkout using the current test-payment options in its documentation. Require `POST /api/registrations/verify-payment` → 200 with `success: true` and `regCode` before the UI shows success. Confirm the matching test order/payment is captured in Dashboard and the local database contains one confirmed team, two confirmed participants, one paid Payment, and counter 1.
3. **Exercise cancellation and recovery with the real Checkout.** Cancel a fresh checkout: no success screen, no confirmed-seat increment. Retry without changing fields: same order. For another test payment, temporarily block only `/api/registrations/verify-payment` in browser DevTools; complete test payment, confirm no UI success, unblock the endpoint, then click **Retry Payment Verification**. Repeat after a same-tab reload. Confirm one code and one seat increment, not two charges.
4. **Verify duplicate/error paths.** Reuse a confirmed test participant's email, phone or registration number (including case variants); expect 409 and an appropriate field error. Send blank/malformed details; expect 400 and no new pending record. Disconnect the API while submitting; verify form data remains and no fake success appears. The automated capacity test covers the 60-person race without requiring 34 actual test payments.
5. **Handle missing callbacks and refunds operationally.** Without webhooks, closing the tab before the signed callback is saved can leave a captured payment unconfirmed. Match the Razorpay order/payment to `Payment.razorpayOrderId` and its registration; reconcile or refund through organiser support. Review `Payment` records with `needsReview: true`; refunds are manual. Never ask an already charged participant to pay again.
6. **Prepare the deployment database and origins.** Use Atlas or a replica set. Before startup against an existing database, review missing/duplicate confirmed `rollNo` values and backfill valid numbers under organiser supervision; the new unique index must build successfully. Check counter vs confirmed count if data has been edited outside the application. Set `CLIENT_ORIGIN` to the deployed frontend origin and build the frontend with its deployed `VITE_API_URL`; test HTTPS/CORS in that environment. No real/production database was tested or migrated here.
7. **Resolve the pre-existing tracked credential file.** Root `.env` is already tracked by Git, although unused by the app. `.gitignore` now excludes env files but does not untrack existing files. Remove it from version control while keeping the local file, and rotate any credentials exposed in shared history. No credentials were printed, copied into examples or newly committed during this audit. History rewriting/credential rotation was not attempted.

For reproducible automated commands, see `server/README.md` and `client/README.md`. The signed-callback recovery and capacity checks do not remove the need for the real test-mode checkout and deployment checks above.
