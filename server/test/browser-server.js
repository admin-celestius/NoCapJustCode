const { setup } = require('./support');
setup(5019).then(({ close, dbName }) => {
  console.log(`Browser test API ready on 5019 (${dbName}); Razorpay is stubbed`);
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await close(); process.exit(0); });
}).catch((err) => { console.error(err); process.exit(1); });
