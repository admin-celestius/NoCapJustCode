# LARPER OR CODER — Frontend Client

Frontend for **LARPER OR CODER**, presented by **Celestius**.

Built with React 19, Vite, CSS Modules, React Hook Form, and Zod v4.

---

## 1. Quick Start

### Prerequisites
- Node.js 22.12+ (or a supported newer release)
- Yarn (`yarn --version`)

### Install Dependencies
```bash
yarn install
```

### Run Local Development Server
```bash
yarn dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Linter
```bash
yarn lint
```

### Production Build & Preview
```bash
yarn build
yarn preview
```

---

## 2. Configuration & Environment Variables

Copy `.env.example` to `.env.local` in `client/`:

```env
VITE_API_URL=http://localhost:5000
```

Use the backend origin, without `/api`. Vite reads this at build time, so rebuild for production after changing it. The backend's `CLIENT_ORIGIN` must match the frontend origin. The public Razorpay key comes from the backend order response; never put a Razorpay secret in any `VITE_` variable.

There is **no mock fallback**. Missing configuration, offline requests, errors and nonexistent routes cannot produce registration success.

---

## 3. Editing Event Data (`client/src/data/event.js`)

All event details, timings, speaker profiles, dates, venues, contact links, and rules are centralized in:

📁 `client/src/data/event.js`

- `date`: `"13 November 2026"`
- `venue`: `"Informed through message"`
- `instructor`: `"Top coder of CIT, 3rd year senior"`
- `connect`: Website and Instagram links
- `SHOW_UNCONFIRMED`: Controls visibility of unconfirmed placeholder content

To update the website content, edit `event.js` directly — all UI components dynamically derive their values from this configuration.

---

## 4. Backend & Payment Integration

- [API contract](./src/services/CONTRACT.md): the actual create-order, verify-payment, health and optional status/check/availability endpoints.
- [payment.js](./src/services/payment.js): loads Checkout, returns signed callback details, and retains verification recovery in the current tab. The modal requires server confirmation before success.
- [Integration audit](../INTEGRATION_AUDIT.md): results and exact remaining manual checks.

## Browser integration tests

Start the disposable MongoDB replica set described in `server/README.md`, install dependencies in both directories, then:

```sh
npx playwright install chromium
TEST_MONGO_URI='mongodb://127.0.0.1:27039/?replicaSet=locTest' npm run test:browser
```

Playwright starts isolated frontend/API servers and uses a new test database. Razorpay Checkout and gateway calls are stubbed; no real payments are made. Tests cover the real UI-to-MongoDB happy path, input validation, cancellation/failure, order reuse, duplicate-field errors, capacity/network responses, verification recovery across reloads, and mobile success gating. Animations are disabled only inside the tests. For an already installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path.
