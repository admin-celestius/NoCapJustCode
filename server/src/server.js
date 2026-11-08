const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function start() {
  for (const name of ['MONGO_URI', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']) {
    if (!process.env[name]?.trim()) throw new Error(`${name} is required`);
  }
  const app = require('./app');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('MongoDB must support transactions (replica set or mongos)');
  // Wait for unique indexes before accepting requests. Never drop existing indexes.
  const models = ['Registration', 'Participant', 'Payment', 'EventConfig'].map((name) => require(`./models/${name}`));
  for (const model of models) await model.init();
  await require('./services/capacity').ensureEventConfig();
  const port = process.env.PORT || 5000;
  const server = app.listen(port, () => console.log(`The server is running on port ${server.address().port}`));
  return server;
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Server startup failed:', err.name, err.code || '',
      /required|must|cannot/.test(err.message) ? err.message : 'Check database connectivity, credentials and indexes.');
    process.exit(1);
  });
}
module.exports = { start };
