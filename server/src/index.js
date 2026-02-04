import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT']
  },
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB
});
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
  CREATE TABLE IF NOT EXISTS public_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    iv TEXT NOT NULL,
    tag TEXT NOT NULL,
    data TEXT NOT NULL
  );
`);

app.use(express.json({ limit: '20mb' }));
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

const createClientId = () => {
  return `server-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const compareClock = (a, b) => {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  if (a.ts !== b.ts) return a.ts > b.ts ? 1 : -1;
  if (a.clientId === b.clientId) return 0;
  return a.clientId > b.clientId ? 1 : -1;
};

const applyPatch = (settings, patch) => {
  const moduleName = patch.module || 'gallery';
  const module = settings[moduleName] || {};
  
  const itemsKey = moduleName === 'gallery' ? 'images' : (moduleName === 'story' ? 'events' : 'items');
  const clocksKey = moduleName === 'gallery' ? 'imageClocks' : 'clocks';
  const tombstonesKey = moduleName === 'gallery' ? 'imageTombstones' : 'tombstones';

  const items = Array.isArray(module[itemsKey]) ? [...module[itemsKey]] : [];
  const clocks = { ...(module[clocksKey] || {}) };
  const tombstones = { ...(module[tombstonesKey] || {}) };

  const tombstone = patch.itemId ? tombstones[patch.itemId] : null;
  if (tombstone && compareClock(tombstone, patch.clock) >= 0) {
    return settings;
  }

  if (patch.action === 'remove') {
    tombstones[patch.itemId] = patch.clock;
    const filtered = items.filter((item) => item.id !== patch.itemId);
    return { ...settings, [moduleName]: { ...module, [itemsKey]: filtered, [clocksKey]: clocks, [tombstonesKey]: tombstones } };
  }

  if (patch.action === 'add') {
    const incoming = patch.item || {};
    const id = patch.itemId || incoming.id || createClientId();
    const existingIndex = items.findIndex((item) => item.id === id);
    const nextItem = { ...incoming, id };
    
    const itemClocks = clocks[id] || {};
    Object.keys(nextItem).forEach(key => {
      if (key !== 'id') itemClocks[key] = patch.clock;
    });
    clocks[id] = itemClocks;

    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], ...nextItem };
    } else {
      items.push(nextItem);
    }
    return { ...settings, [moduleName]: { ...module, [itemsKey]: items, [clocksKey]: clocks, [tombstonesKey]: tombstones } };
  }

  if (patch.action === 'update') {
    const index = items.findIndex((item) => item.id === patch.itemId);
    if (index === -1) return settings;

    const itemClocks = clocks[patch.itemId] || {};
    const existingClock = itemClocks[patch.field];
    if (compareClock(patch.clock, existingClock) <= 0) {
      return settings;
    }

    const nextItem = { ...items[index], [patch.field]: patch.value };
    items[index] = nextItem;
    itemClocks[patch.field] = patch.clock;
    clocks[patch.itemId] = itemClocks;

    return { ...settings, [moduleName]: { ...module, [itemsKey]: items, [clocksKey]: clocks, [tombstonesKey]: tombstones } };
  }

  return settings;
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

// Socket.io middleware and connection handling
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.user = null;
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  socket.join('global');
  if (socket.user?.userId) {
    const userId = socket.user.userId;
    socket.join(`user:${userId}`);
    console.log(`User ${userId} connected to socket`);
  } else {
    console.log('Public client connected to socket');
  }

  socket.on('image_patch', (payload, callback) => {
    const patch = payload?.patch;
    if (!patch || !patch.action || !patch.clock || typeof patch.clock.ts !== 'number' || !patch.clock.clientId) {
      if (typeof callback === 'function') callback({ ok: false, error: 'invalid_patch' });
      return;
    }
    if (payload?.scope === 'private' && !socket.user?.userId) {
      if (typeof callback === 'function') callback({ ok: false, error: 'unauthorized' });
      return;
    }
    
    try {
      const row = db.prepare('SELECT * FROM public_settings WHERE id = 1').get();
      const baseSettings = row
        ? decryptSettings(row)
        : { gallery: { images: [], imageClocks: {}, imageTombstones: {} } };
      
      const nextSettings = applyPatch(baseSettings, patch);
      const now = Date.now();
      const nextVersion = row ? (row.version || 0) + 1 : 1;
      const encrypted = encryptSettings(nextSettings);
      
      if (!row) {
        db.prepare('INSERT INTO public_settings (id, version, updated_at, iv, tag, data) VALUES (1, ?, ?, ?, ?, ?)')
          .run(nextVersion, now, encrypted.iv, encrypted.tag, encrypted.data);
      } else {
        db.prepare('UPDATE public_settings SET version = ?, updated_at = ?, iv = ?, tag = ?, data = ? WHERE id = 1')
          .run(nextVersion, now, encrypted.iv, encrypted.tag, encrypted.data);
      }
      
      // Broadcast the patch to everyone EXCEPT the sender to avoid double-application
      socket.to('global').emit('image_patch', { patch, version: nextVersion, updatedAt: now });
      
      // Notify everyone that settings were updated (for those not using patches or for other modules)
      io.to('global').emit('settings_updated', { version: nextVersion, updatedAt: now });
      
      if (typeof callback === 'function') {
        callback({ ok: true, version: nextVersion, updatedAt: now });
      }
    } catch (err) {
      console.error('Error applying image patch:', err);
      if (typeof callback === 'function') callback({ ok: false, error: 'server_error' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.user?.userId) {
      console.log(`User ${socket.user.userId} disconnected from socket`);
      return;
    }
    console.log('Public client disconnected from socket');
  });
});

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
  const row = db.prepare('SELECT * FROM public_settings WHERE id = 1').get();
  if (!row) {
    res.json({ settings: null, version: 0, updatedAt: 0 });
    return;
  }
  const settings = decryptSettings(row);
  res.json({ settings, version: row.version, updatedAt: row.updated_at });
});

app.get('/public-settings', (req, res) => {
  const row = db.prepare('SELECT * FROM public_settings WHERE id = 1').get();
  if (!row) {
    res.json({ settings: null, version: 0, updatedAt: 0 });
    return;
  }
  const settings = decryptSettings(row);
  res.json({ settings, version: row.version, updatedAt: row.updated_at });
});

app.put('/public-settings', (req, res) => {
  const { settings, clientVersion, updatedAt } = req.body || {};
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'invalid_payload' });
    return;
  }
  const now = typeof updatedAt === 'number' ? updatedAt : Date.now();
  const row = db.prepare('SELECT * FROM public_settings WHERE id = 1').get();
  if (!row) {
    const encrypted = encryptSettings(settings);
    db.prepare('INSERT INTO public_settings (id, version, updated_at, iv, tag, data) VALUES (1, ?, ?, ?, ?, ?)')
      .run(1, now, encrypted.iv, encrypted.tag, encrypted.data);

    io.to('global').emit('settings_updated', {
      version: 1,
      updatedAt: now
    });

    res.json({ version: 1, updatedAt: now });
    return;
  }

  const isOutdatedVersion = typeof clientVersion === 'number' && clientVersion < row.version;
  const isOutdatedTimestamp = now < row.updated_at;

  if (isOutdatedVersion || isOutdatedTimestamp) {
    const serverSettings = decryptSettings(row);
    res.status(409).json({
      error: 'conflict',
      server: { settings: serverSettings, version: row.version, updatedAt: row.updated_at }
    });
    return;
  }

  const nextVersion = (row.version || 0) + 1;
  const encrypted = encryptSettings(settings);
  db.prepare('UPDATE public_settings SET version = ?, updated_at = ?, iv = ?, tag = ?, data = ? WHERE id = 1')
    .run(nextVersion, now, encrypted.iv, encrypted.tag, encrypted.data);

  io.to('global').emit('settings_updated', {
    version: nextVersion,
    updatedAt: now
  });

  res.json({ version: nextVersion, updatedAt: now });
});

app.put('/settings', authMiddleware, (req, res) => {
  const { settings, clientVersion, updatedAt } = req.body || {};
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'invalid_payload' });
    return;
  }
  const now = typeof updatedAt === 'number' ? updatedAt : Date.now();
  const row = db.prepare('SELECT * FROM public_settings WHERE id = 1').get();
  if (!row) {
    const encrypted = encryptSettings(settings);
    db.prepare('INSERT INTO public_settings (id, version, updated_at, iv, tag, data) VALUES (1, ?, ?, ?, ?, ?)')
      .run(1, now, encrypted.iv, encrypted.tag, encrypted.data);

    io.to('global').emit('settings_updated', {
      version: 1,
      updatedAt: now
    });

    res.json({ version: 1, updatedAt: now });
    return;
  }

  // Check for version conflict or timestamp conflict
  const isOutdatedVersion = typeof clientVersion === 'number' && clientVersion < row.version;
  const isOutdatedTimestamp = now < row.updated_at;

  if (isOutdatedVersion || isOutdatedTimestamp) {
    const serverSettings = decryptSettings(row);
    res.status(409).json({
      error: 'conflict',
      server: { settings: serverSettings, version: row.version, updatedAt: row.updated_at }
    });
    return;
  }

  const nextVersion = (row.version || 0) + 1;
  const encrypted = encryptSettings(settings);
  db.prepare('UPDATE public_settings SET version = ?, updated_at = ?, iv = ?, tag = ?, data = ? WHERE id = 1')
    .run(nextVersion, now, encrypted.iv, encrypted.tag, encrypted.data);

  io.to('global').emit('settings_updated', {
    version: nextVersion,
    updatedAt: now
  });

  res.json({ version: nextVersion, updatedAt: now });
});

httpServer.listen(port, () => {
  console.log(`settings server running on ${port}`);
});
