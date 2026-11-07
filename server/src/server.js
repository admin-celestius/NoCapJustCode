require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const registrationRoutes = require('./routes/registration.routes');
const { razorpayWebhook } = require('./controllers/webhook.controller');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

app.use(express.json({ limit: '50kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/registrations', registrationRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  // Razorpay SDK errors look like { statusCode, error: { description } }
  if (err && err.error && err.statusCode) {
    return res.status(502).json({ message: 'Payment gateway error', detail: err.error.description });
  }
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`The server is running on port ${PORT}`)))
  .catch((err) => {
    console.error('Mongo connection failed', err);
    process.exit(1);
  });
