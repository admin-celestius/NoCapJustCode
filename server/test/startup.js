const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

async function checkStartup(uri) {
  const address = new URL(uri);
  address.pathname = `/loc_startup_${Date.now()}_${process.pid}`;
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, MONGO_URI: address.toString(), PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server startup timed out')), 15000);
      child.stdout.on('data', (data) => {
        const match = data.toString().match(/running on port (\d+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
      child.stderr.on('data', (data) => process.stderr.write(data));
    });
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
}
module.exports = { checkStartup };
