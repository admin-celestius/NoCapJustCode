const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const registrationRoutes = require('./routes/registration.routes');

const app = express();
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '50kb' }));
app.get('/health', (req, res) => {
  const ok = mongoose.connection.readyState === 1;
  res.status(ok ? 200 : 503).json({ ok });
});
app.use('/api/registrations', registrationRoutes);
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  if (err && err.error && err.statusCode) {
    return res.status(502).json({ message: 'Payment gateway error. Please retry shortly.' });
  }
  // Do not log request bodies, credentials, connection strings or SDK configuration.
  console.error('Request failed:', err.name || 'Error', err.code || err.status || 500);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Internal server error' });
});
module.exports = app;
