// server/src/utils/ensureMongo.js
const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const mongoose = require('mongoose');

function isPortOpen(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      status = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function findMongodExecutable() {
  // Check if mongod is in PATH
  try {
    const whichCmd = process.platform === 'win32' ? 'where.exe mongod' : 'which mongod';
    const out = execSync(whichCmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    if (out) {
      const first = out.split(/\r?\n/)[0].trim();
      if (fs.existsSync(first)) return first;
    }
  } catch {}

  // Common Windows installation paths
  if (process.platform === 'win32') {
    const versions = ['9.0', '8.0', '7.0', '6.0', '5.0'];
    for (const ver of versions) {
      const candidate = `C:\\Program Files\\MongoDB\\Server\\${ver}\\bin\\mongod.exe`;
      if (fs.existsSync(candidate)) return candidate;
    }
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      for (const ver of versions) {
        const candidate = path.join(localAppData, `Programs\\MongoDB\\Server\\${ver}\\bin\\mongod.exe`);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }

  return null;
}

async function ensureMongo(mongoUri) {
  if (!mongoUri) return;

  let host = '127.0.0.1';
  let port = 27040;
  let replSet = 'locDev';

  try {
    const match = mongoUri.match(/mongodb:\/\/(?:[^@]+@)?([^:/]+)(?::(\d+))?/);
    if (match) {
      if (match[1]) host = match[1];
      if (match[2]) port = parseInt(match[2], 10);
    }
    const rsMatch = mongoUri.match(/replicaSet=([^&]+)/);
    if (rsMatch) replSet = rsMatch[1];
  } catch {}

  // Only auto-start for loopback / local development
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!isLoopback) return;

  const open = await isPortOpen(host, port, 1200);
  if (open) {
    // Port is already accepting connections
    return;
  }

  console.log(`[MongoDB] Port ${port} is not responding. Checking for local MongoDB executable...`);
  const mongodExe = findMongodExecutable();
  if (!mongodExe) {
    console.warn(`[MongoDB] Warning: Could not find mongod.exe to auto-start local MongoDB.`);
    return;
  }

  const dbPath = path.resolve(__dirname, '../../.local-mongo');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
  const logPath = path.join(dbPath, 'mongod.log');

  console.log(`[MongoDB] Starting local replica set "${replSet}" on port ${port}...`);
  const child = spawn(
    mongodExe,
    [
      '--replSet', replSet,
      '--port', String(port),
      '--bind_ip', '127.0.0.1',
      '--dbpath', dbPath,
      '--logpath', logPath,
    ],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }
  );
  child.unref();

  // Wait for port to become open
  const startWait = Date.now();
  let ready = false;
  while (Date.now() - startWait < 15000) {
    await new Promise((r) => setTimeout(r, 400));
    if (await isPortOpen('127.0.0.1', port, 800)) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    console.warn(`[MongoDB] Warning: mongod was started but port ${port} did not respond within 15 seconds.`);
    return;
  }

  console.log(`[MongoDB] Connected to local instance on port ${port}. Verifying replica set state...`);

  // Verify or initiate replica set
  try {
    const directUri = `mongodb://127.0.0.1:${port}/?directConnection=true`;
    const conn = await mongoose.createConnection(directUri, { serverSelectionTimeoutMS: 5000 }).asPromise();
    try {
      const hello = await conn.db.admin().command({ hello: 1 });
      if (!hello.setName) {
        console.log(`[MongoDB] Initiating replica set "${replSet}"...`);
        await conn.db.admin().command({
          replSetInitiate: {
            _id: replSet,
            members: [{ _id: 0, host: `127.0.0.1:${port}` }],
          },
        });
        // Give replica set time to transition to primary
        await new Promise((r) => setTimeout(r, 2000));
      }
    } finally {
      await conn.close();
    }
  } catch (err) {
    // If already initiated or concurrently initialized, proceed
    if (!/already initialized/i.test(err.message)) {
      console.warn(`[MongoDB] Replica set check note:`, err.message);
    }
  }

  console.log(`[MongoDB] Local replica set ready.`);
}

module.exports = { ensureMongo };
