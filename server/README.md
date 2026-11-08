# LARPER OR CODER registration backend

Node/Express, Mongoose, Zod and Razorpay. ₹149 per person / ₹298 per pair; maximum 30 confirmed teams (60 participants).

## Run

From `server/`:

```sh
yarn install
# Fresh installation only: preserve an existing .env.
cp .env.example .env
# Fill in a dedicated MongoDB replica-set database and Razorpay test credentials.
npm run dev
```

`src/server.js` always loads **server/.env**, regardless of the shell's working directory. Shell/deployment variables take precedence. The repository-root `.env` is not consumed. Startup requires MongoDB connectivity, transaction support and successful model/unique-index initialization before opening the HTTP port. `/health` also reports loss of the database connection.

| Variable | Value / meaning |
| --- | --- |
| `MONGO_URI` | MongoDB replica set or Atlas database URI; required |
| `PORT` | Backend port; default 5000 |
| `CLIENT_ORIGIN` | Exact frontend origin(s), comma-separated; default `http://localhost:5173` |
| `RAZORPAY_KEY_ID` | Test/live public key for the matching Razorpay environment; required |
| `RAZORPAY_KEY_SECRET` | Matching server-only secret; required |
| `FEE_PER_PERSON_INR` | 149; any value producing a different price fails startup |
| `MAX_TEAMS` | Default 30; integers 0–30 only (0 closes registration) |
| `HOLD_MINUTES` | Default 15; pending-checkout hold window, 0 disables soft holds |

`FRONTEND_URL`, `TRUST_PROXY`, `REGISTRATION_FEE_PER_PERSON`, registration-token and admin variables from the old root configuration are not used. No authentication/admin feature exists in this backend. Registration APIs are public; proof of payment requires a server-verified Checkout signature. No `trust proxy` setting is added.

## Local development database configured by this audit

With user approval, the local `server/.env` now uses:

```env
MONGO_URI=mongodb://127.0.0.1:27040/larper_or_coder?replicaSet=locDev
```

This separate replica set stores data in ignored `server/.local-mongo/`. The original standalone database was not changed. The replica set has already been initialized. To restart it after a reboot, run from `server/`:

```sh
mongod --replSet locDev --port 27040 --bind_ip 127.0.0.1 --dbpath "$PWD/.local-mongo" --logpath "$PWD/.local-mongo/mongod.log" --fork
```

For a new clone, first create the directory, start the command above, then initialize once:

```sh
mkdir -p .local-mongo
# Run the mongod command above before this initialization command.
mongosh 'mongodb://127.0.0.1:27040/?directConnection=true' --quiet --eval 'rs.initiate({_id:"locDev",members:[{_id:0,host:"127.0.0.1:27040"}]})'
```

Do not use the separate test replica set on port 27039 for normal registrations. Do not rerun initialization against an already initialized replica set.

## Registration and payment lifecycle

1. Zod validates two complete participants. The form's registration-number label maps to existing `Participant.rollNo`; no `reg_number` database field was introduced.
2. A MongoDB transaction creates the pending team and both participants. The external Razorpay order call occurs outside the transaction so transaction retries cannot duplicate gateway calls. Gateway/setup failure removes this attempt and its hold.
3. The client opens Checkout using the returned public key, order, amount and prefill.
4. `verify-payment` verifies the signature and fetches payment details from Razorpay. It checks the stored order, payment ID, amount, currency and captured state; authorized payments are captured. Concurrent capture races are re-fetched safely.
5. The existing confirmation transaction claims one team seat, confirms both participants and the payment, and returns the registration code. All confirmation replays are idempotent.
6. Pending attempts count only as temporary soft holds. They stop holding seats after `HOLD_MINUTES`; abandoned records expire via the existing 24-hour TTL. Confirmed/refund-review records have their TTL removed.

The counter's conditional increment inside the transaction enforces the hard limit. Soft holds are advisory and can race; a late/concurrent payment can be received when the last seat is already gone. Such teams become `refund_required`, participants `cancelled`, and Payment `paid` + `needsReview`. Duplicate-index failures roll back seat increments before marking the payment for review. Missing/partial pairs cannot confirm. **Refunds are manual in Razorpay Dashboard; the application does not issue or promise automatic refunds.**

The legacy webhook controller/signature helper remain in the repository for reference, but **no webhook route is mounted**. The active flow requires the Checkout verification request and does not use webhooks. If the tab disappears before the signed callback is saved, organisers must reconcile the Razorpay payment/order and database record manually. Do not tell a charged user to pay again.

Before deploying onto an existing database, review confirmed participants for missing or duplicate registration numbers. Backfill valid `rollNo` values after organiser review; do not delete registrations or drop indexes. The new case-insensitive unique confirmed-roll-number index may reject inconsistent legacy data. Confirm `EventConfig.confirmedCount` equals the confirmed registration count before opening registration if the database has been edited outside this application.

See [API contract](../client/src/services/CONTRACT.md) and [audit/manual release checks](../INTEGRATION_AUDIT.md).

## Automated checks

```sh
npm test
TEST_MONGO_URI='mongodb://127.0.0.1:27039/?replicaSet=locTest' npm run test:integration
```

The integration suite refuses a non-loopback URI and requires explicit `TEST_MONGO_URI`. It never loads `.env`, never falls back to `MONGO_URI`, uses a new `loc_integration_*` database per run, and stubs only Razorpay network calls. Resets affect only that run's generated test database. It also starts the real backend entry point with a separate `loc_startup_*` database and test credentials.

To create a disposable replica set (choose an unused port):

```sh
mkdir -p /tmp/loc-integration-mongo
mongod --replSet locTest --port 27039 --bind_ip 127.0.0.1 --dbpath /tmp/loc-integration-mongo --logpath /tmp/loc-integration-mongo/mongod.log --fork
mongosh 'mongodb://127.0.0.1:27039/?directConnection=true' --quiet --eval 'rs.initiate({_id:"locTest",members:[{_id:0,host:"127.0.0.1:27039"}]})'
```

Do not run the test suite against an event/production database. After tests, stop this specific test instance; its disposable files remain in `/tmp/loc-integration-mongo`.
