import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const dataDir = path.join(process.cwd(), 'server', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'settings.db');
const db = new Database(dbPath);

const jwtSecret = process.env.JWT_SECRET;
const encryptionKeyRaw = process.env.SETTINGS_ENCRYPTION_KEY;

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

if (!encryptionKeyRaw) {
  throw new Error('SETTINGS_ENCRYPTION_KEY is required');
}

const encryptionKey = Buffer.from(encryptionKeyRaw, 'base64');
if (encryptionKey.length !== 32) {
  throw new Error('SETTINGS_ENCRYPTION_KEY must be 32 bytes in base64');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER PRIMARY KEY,
    version INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    iv TEXT NOT NULL,
    tag TEXT NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

const encryptSettings = (settings) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const json = JSON.stringify(settings);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  };
};

const decryptSettings = (row) => {
  const iv = Buffer.from(row.iv, 'base64');
  const tag = Buffer.from(row.tag, 'base64');
  const encrypted = Buffer.from(row.data, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
};

const signToken = (user) => {
  return jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: '30d' });
};

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid_token' });
  }
};

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/auth/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 6) {
    res.status(400).json({ error: 'invalid_payload' });
    return;
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'email_exists' });
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  const now = Date.now();
  const info = db.prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)').run(email, hash, now);
  const user = { id: info.lastInsertRowid, email };
  const token = signToken(user);
  res.json({ token, email });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'invalid_payload' });
    return;
  }
  const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  const token = signToken(user);
  res.json({ token, email: user.email });
});

app.get('/settings', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.user.userId);
  if (!row) {
    res.json({ settings: null, version: 0, updatedAt: 0 });
    return;
  }
  const settings = decryptSettings(row);
  res.json({ settings, version: row.version, updatedAt: row.updated_at });
});

app.put('/settings', authMiddleware, (req, res) => {
  const { settings, clientVersion, updatedAt } = req.body || {};
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'invalid_payload' });
    return;
  }
  const now = typeof updatedAt === 'number' ? updatedAt : Date.now();
  const row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.user.userId);
  if (!row) {
    const encrypted = encryptSettings(settings);
    db.prepare('INSERT INTO settings (user_id, version, updated_at, iv, tag, data) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user.userId, 1, now, encrypted.iv, encrypted.tag, encrypted.data);
    res.json({ version: 1, updatedAt: now });
    return;
  }
  if (now < row.updated_at) {
    const serverSettings = decryptSettings(row);
    res.status(409).json({
      error: 'conflict',
      server: { settings: serverSettings, version: row.version, updatedAt: row.updated_at }
    });
    return;
  }
  const nextVersion = (row.version || 0) + 1;
  const encrypted = encryptSettings(settings);
  db.prepare('UPDATE settings SET version = ?, updated_at = ?, iv = ?, tag = ?, data = ? WHERE user_id = ?')
    .run(nextVersion, now, encrypted.iv, encrypted.tag, encrypted.data, req.user.userId);
  res.json({ version: nextVersion, updatedAt: now });
});

app.listen(port, () => {
  console.log(`settings server running on ${port}`);
});
