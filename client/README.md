# LARPER OR CODER — Frontend Client

Frontend for **LARPER OR CODER**, presented by **Celestius**.

Built with React 19, Vite, CSS Modules, React Hook Form, and Zod v4.

---

## 1. Quick Start

### Prerequisites
- Node.js 18+
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

Copy or create a `.env` file in the `client/` root:

```env
# Optional: backend API URL (defaults to http://localhost:5000 if omitted)
VITE_API_URL=http://localhost:5000

# Optional: force mock adapter mode even if server is running
# VITE_USE_MOCK=true
```

> **Note**: If `VITE_API_URL` is omitted, offline, or returns 404, the application automatically falls back to the built-in mock adapter (`client/src/services/mockApi.js`), so development and UI testing never break.

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

- **Backend API Contract**: See [`client/src/services/CONTRACT.md`](./src/services/CONTRACT.md) for the exact `POST /api/register` and `GET /health` specification, validation schemas, and expected responses.
- **Payment Seam**: Razorpay payments are decoupled into [`client/src/services/payment.js`](./src/services/payment.js). It exports `startPayment(registration)` which currently returns `{ status: "skipped" }`. Teammates can implement Razorpay checkout directly inside that seam without touching the registration form logic.
