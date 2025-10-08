const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const DATABASE_DIR = process.env.DATABASE_DIR || path.join(__dirname, 'data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Ensure database directory exists
fs.mkdirSync(DATABASE_DIR, { recursive: true });

// Database connection manager for multi-company support
const dbConnections = new Map();

const getDatabase = (locationId) => {
  if (!dbConnections.has(locationId)) {
    const dbFile = path.join(DATABASE_DIR, `ristomanager_${locationId}.db`);
    const db = new sqlite3.Database(dbFile);
    
    // Initialize tables for this company
    initializeDatabase(db);
    dbConnections.set(locationId, db);
  }
  return dbConnections.get(locationId);
};

const initializeDatabase = (db) => {
  db.serialize(() => {
    // Financial Plan State Table (now per company)
    db.run(`CREATE TABLE IF NOT EXISTS financial_plan_state (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    // Locations Table (master locations - shared)
    db.run(`CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    // Reservations Table (per company)
    db.run(`CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      reservation_time TEXT NOT NULL,
      status TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      notes TEXT,
      table_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (table_id) REFERENCES tables(id)
    )`);

    // Tables Table (per company)
    db.run(`CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT NOT NULL,
      shape TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      reservation_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    )`);

    // Waitlist Table (per company)
    db.run(`CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      phone TEXT,
      quoted_wait_time INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (location_id) REFERENCES locations(id)
    )`);

    // Menu Items Table (per company)
    db.run(`CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    // Sales Table (per company)
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      table_id TEXT,
      reservation_id TEXT,
      items TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (table_id) REFERENCES tables(id),
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    )`);

    // Business Plan Drafts Table (per company)
    db.run(`CREATE TABLE IF NOT EXISTS business_plan_drafts (
      id TEXT PRIMARY KEY,
      target_year INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    // Customers Table (per company)
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      total_visits INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      last_visit TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  });
};

// Initialize master database for locations, users, and auth (shared across companies)
const masterDb = new sqlite3.Database(path.join(DATABASE_DIR, 'master.db'));
masterDb.serialize(() => {
  // Locations table
  masterDb.run(`CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  
  // Add status column if it doesn't exist (for existing databases)
  masterDb.run(`ALTER TABLE locations ADD COLUMN status TEXT DEFAULT 'active'`, (err) => {
    // Ignore error if column already exists
  });

  // Users table
  masterDb.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  // User sessions table
  masterDb.run(`CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // User location permissions table
  masterDb.run(`CREATE TABLE IF NOT EXISTS user_location_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    UNIQUE(user_id, location_id)
  )`);

  // Location enabled tabs table
  masterDb.run(`CREATE TABLE IF NOT EXISTS location_enabled_tabs (
    id TEXT PRIMARY KEY,
    location_id TEXT NOT NULL,
    tab_name TEXT NOT NULL,
    is_enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    UNIQUE(location_id, tab_name)
  )`);
});

// Initialize default database for backward compatibility
const defaultDb = getDatabase('default');

// Authentication utilities
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  masterDb.get(
    'SELECT u.*, s.id as session_id FROM users u JOIN user_sessions s ON u.id = s.user_id WHERE s.token = ? AND u.is_active = 1',
    [token],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      req.user = user;
      next();
    }
  );
}

// Middleware to check admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Multi-company state management
function getState(locationId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase(locationId);
    const stateId = `financial-plan-${locationId}`;
    db.get(
      'SELECT data FROM financial_plan_state WHERE id = ?',
      [stateId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          resolve(null);
          return;
        }
        try {
          const parsed = JSON.parse(row.data);
          resolve(parsed);
        } catch (parseError) {
          reject(parseError);
        }
      },
    );
  });
}

function saveState(payload, locationId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase(locationId);
    const now = new Date().toISOString();
    const data = JSON.stringify(payload);
    const stateId = `financial-plan-${locationId}`;
    db.run(
      `INSERT INTO financial_plan_state (id, data, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      [stateId, data, now],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(now);
      },
    );
  });
}

function buildPayload(body) {
  const fallback = {
    preventivoOverrides: {},
    consuntivoOverrides: {},
    manualLog: [],
    monthlyMetrics: [],
    statsOverrides: {},
    causaliCatalog: [],
    causaliVersion: null,
  };

  if (!body || typeof body !== 'object') {
    return fallback;
  }

  const payload = { ...fallback };

  if (body.preventivoOverrides && typeof body.preventivoOverrides === 'object') {
    payload.preventivoOverrides = body.preventivoOverrides;
  }
  if (body.consuntivoOverrides && typeof body.consuntivoOverrides === 'object') {
    payload.consuntivoOverrides = body.consuntivoOverrides;
  }
  if (Array.isArray(body.manualLog)) {
    payload.manualLog = body.manualLog;
  }
  if (body.statsOverrides && typeof body.statsOverrides === 'object') {
    payload.statsOverrides = body.statsOverrides;
  }
  if (Array.isArray(body.monthlyMetrics)) {
    payload.monthlyMetrics = body.monthlyMetrics;
  }
  if (Array.isArray(body.causaliCatalog)) {
    payload.causaliCatalog = body.causaliCatalog;
  }
  if (typeof body.causaliVersion === 'string') {
    payload.causaliVersion = body.causaliVersion;
  }

  return payload;
}

// Multi-company database helper functions
function dbQuery(locationId, sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDatabase(locationId);
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(locationId, sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDatabase(locationId);
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(locationId, sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDatabase(locationId);
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Master database functions (for locations)
function masterDbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    masterDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function masterDbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    masterDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function masterDbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    masterDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication API
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await masterDbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check if this is the first user (make them admin)
    const userCount = await masterDbQuery('SELECT COUNT(*) as count FROM users');
    const isFirstUser = userCount[0].count === 0;
    const role = isFirstUser ? 'admin' : 'user';

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    // Create user
    await masterDbRun(
      'INSERT INTO users (id, first_name, last_name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, firstName, lastName, email, passwordHash, role, now, now]
    );

    // Create session
    const token = generateToken();
    const sessionId = crypto.randomUUID();
    await masterDbRun(
      'INSERT INTO user_sessions (id, user_id, token, created_at) VALUES (?, ?, ?, ?)',
      [sessionId, userId, token, now]
    );

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        firstName,
        lastName,
        email,
        role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const passwordHash = hashPassword(password);
    const user = await masterDbGet(
      'SELECT id, first_name, last_name, email, role FROM users WHERE email = ? AND password_hash = ? AND is_active = 1',
      [email, passwordHash]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create new session
    const token = generateToken();
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await masterDbRun(
      'INSERT INTO user_sessions (id, user_id, token, created_at) VALUES (?, ?, ?, ?)',
      [sessionId, user.id, token, now]
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await masterDbRun('DELETE FROM user_sessions WHERE token = ?', [req.headers.authorization?.replace('Bearer ', '')]);
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

app.get('/api/financial-plan/state', async (req, res) => {
  try {
    const locationId = req.query.locationId || req.headers['x-location-id'];
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }
    
    const state = await getState(locationId);
    if (!state) {
      res.json({
        preventivoOverrides: {},
        consuntivoOverrides: {},
        manualLog: [],
        monthlyMetrics: [],
        statsOverrides: {},
        causaliCatalog: [],
        causaliVersion: null,
      });
      return;
    }
    res.json(state);
  } catch (error) {
    console.error('Failed to load financial plan state', error);
    res.status(500).json({ error: 'Failed to load state' });
  }
});

app.put('/api/financial-plan/state', async (req, res) => {
  try {
    const locationId = req.query.locationId || req.headers['x-location-id'];
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }
    
    const payload = buildPayload(req.body);
    const updatedAt = await saveState(payload, locationId);
    res.json({ success: true, updatedAt });
  } catch (error) {
    console.error('Failed to save financial plan state', error);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

// Locations API (Master database - shared across companies)
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await masterDbQuery('SELECT * FROM locations ORDER BY name');
    res.json(locations);
  } catch (error) {
    console.error('Failed to get locations', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

app.post('/api/locations', async (req, res) => {
  try {
    const { id, name, capacity, openTime, closeTime } = req.body;
    const now = new Date().toISOString();
    
    await masterDbRun(
      'INSERT INTO locations (id, name, capacity, open_time, close_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, capacity, openTime, closeTime, now, now]
    );
    
    const location = await masterDbGet('SELECT * FROM locations WHERE id = ?', [id]);
    res.json(location);
  } catch (error) {
    console.error('Failed to create location', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

app.put('/api/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity, openTime, closeTime } = req.body;
    const now = new Date().toISOString();
    
    await masterDbRun(
      'UPDATE locations SET name = ?, capacity = ?, open_time = ?, close_time = ?, updated_at = ? WHERE id = ?',
      [name, capacity, openTime, closeTime, now, id]
    );
    
    const location = await masterDbGet('SELECT * FROM locations WHERE id = ?', [id]);
    res.json(location);
  } catch (error) {
    console.error('Failed to update location', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Reservations API (per company)
app.get('/api/reservations/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const reservations = await dbQuery(locationId,
      'SELECT * FROM reservations WHERE location_id = ? ORDER BY reservation_time',
      [locationId]
    );
    res.json(reservations);
  } catch (error) {
    console.error('Failed to get reservations', error);
    res.status(500).json({ error: 'Failed to get reservations' });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { locationId, guestName, partySize, reservationTime, phone, email, notes, tableId } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    
    await dbRun(locationId,
      'INSERT INTO reservations (id, location_id, guest_name, party_size, reservation_time, status, phone, email, notes, table_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, locationId, guestName, partySize, reservationTime, 'confirmed', phone, email, notes, tableId, now, now]
    );
    
    const reservation = await dbGet(locationId, 'SELECT * FROM reservations WHERE id = ?', [id]);
    res.json(reservation);
  } catch (error) {
    console.error('Failed to create reservation', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

app.put('/api/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, locationId } = req.body;
    const now = new Date().toISOString();
    
    await dbRun(locationId,
      'UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, id]
    );
    
    const reservation = await dbGet(locationId, 'SELECT * FROM reservations WHERE id = ?', [id]);
    res.json(reservation);
  } catch (error) {
    console.error('Failed to update reservation status', error);
    res.status(500).json({ error: 'Failed to update reservation status' });
  }
});

// Tables API
app.get('/api/tables/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const tables = await dbQuery(locationId,
      'SELECT * FROM tables WHERE location_id = ? ORDER BY name',
      [locationId]
    );
    res.json(tables);
  } catch (error) {
    console.error('Failed to get tables', error);
    res.status(500).json({ error: 'Failed to get tables' });
  }
});

app.put('/api/tables/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const now = new Date().toISOString();
    
    await dbRun(
      'UPDATE tables SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, id]
    );
    
    const table = await dbGet('SELECT * FROM tables WHERE id = ?', [id]);
    res.json(table);
  } catch (error) {
    console.error('Failed to update table status', error);
    res.status(500).json({ error: 'Failed to update table status' });
  }
});

app.put('/api/tables/:locationId/layout', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { tables } = req.body;
    const now = new Date().toISOString();
    
    // Delete existing tables for this location
    await dbRun('DELETE FROM tables WHERE location_id = ?', [locationId]);
    
    // Insert new tables
    for (const table of tables) {
      await dbRun(
        'INSERT INTO tables (id, location_id, name, capacity, status, shape, x, y, width, height, reservation_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [table.id, locationId, table.name, table.capacity, table.status, table.shape, table.x, table.y, table.width, table.height, table.reservationId, now, now]
      );
    }
    
    const updatedTables = await dbQuery(locationId, 'SELECT * FROM tables WHERE location_id = ?', [locationId]);
    res.json(updatedTables);
  } catch (error) {
    console.error('Failed to save table layout', error);
    res.status(500).json({ error: 'Failed to save table layout' });
  }
});

// Waitlist API
app.get('/api/waitlist/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const waitlist = await dbQuery(locationId,
      'SELECT * FROM waitlist WHERE location_id = ? ORDER BY created_at',
      [locationId]
    );
    res.json(waitlist);
  } catch (error) {
    console.error('Failed to get waitlist', error);
    res.status(500).json({ error: 'Failed to get waitlist' });
  }
});

app.post('/api/waitlist', async (req, res) => {
  try {
    const { locationId, guestName, partySize, phone, quotedWaitTime } = req.body;
    const id = 'w' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    
    await dbRun(
      'INSERT INTO waitlist (id, location_id, guest_name, party_size, phone, quoted_wait_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, locationId, guestName, partySize, phone, quotedWaitTime, now]
    );
    
    const entry = await dbGet('SELECT * FROM waitlist WHERE id = ?', [id]);
    res.json(entry);
  } catch (error) {
    console.error('Failed to add waitlist entry', error);
    res.status(500).json({ error: 'Failed to add waitlist entry' });
  }
});

app.delete('/api/waitlist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM waitlist WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to remove waitlist entry', error);
    res.status(500).json({ error: 'Failed to remove waitlist entry' });
  }
});

// Menu Items API
app.get('/api/menu-items/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const menuItems = await dbQuery(locationId, 'SELECT * FROM menu_items ORDER BY category, name');
    res.json(menuItems);
  } catch (error) {
    console.error('Failed to get menu items', error);
    res.status(500).json({ error: 'Failed to get menu items' });
  }
});

// Sales API
app.get('/api/sales/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const sales = await dbQuery(locationId,
      'SELECT * FROM sales WHERE location_id = ? ORDER BY created_at DESC',
      [locationId]
    );
    res.json(sales);
  } catch (error) {
    console.error('Failed to get sales', error);
    res.status(500).json({ error: 'Failed to get sales' });
  }
});

// Business Plan Drafts API
app.get('/api/business-plan-drafts', async (req, res) => {
  try {
    const locationId = req.query.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }
    
    const db = getDatabase(locationId);
    const drafts = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM business_plan_drafts ORDER BY target_year', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const draftsMap = {};
    drafts.forEach(draft => {
      draftsMap[draft.target_year] = JSON.parse(draft.data);
    });
    res.json(draftsMap);
  } catch (error) {
    console.error('Failed to get business plan drafts', error);
    res.status(500).json({ error: 'Failed to get business plan drafts' });
  }
});

app.put('/api/business-plan-drafts', async (req, res) => {
  try {
    const { targetYear, data, locationId } = req.body;
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }
    
    const now = new Date().toISOString();
    const id = `draft-${targetYear}`;
    
    const db = getDatabase(locationId);
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO business_plan_drafts (id, target_year, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
        [id, targetYear, JSON.stringify(data), now, now],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save business plan draft', error);
    res.status(500).json({ error: 'Failed to save business plan draft' });
  }
});

// Initialize default data
app.post('/api/init-default-data', async (req, res) => {
  try {
    const now = new Date().toISOString();
    
    // Check if data already exists
    const existingLocations = await masterDbQuery('SELECT COUNT(*) as count FROM locations');
    if (existingLocations[0].count > 0) {
      res.json({ message: 'Default data already exists' });
      return;
    }
    
    // Insert default locations
    await masterDbRun(
      'INSERT INTO locations (id, name, capacity, open_time, close_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['loc-1', 'Trattoria del Ponte', 50, '18:00', '23:00', now, now]
    );
    
    await masterDbRun(
      'INSERT INTO locations (id, name, capacity, open_time, close_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['loc-2', 'Pizzeria al Forno', 80, '19:00', '24:00', now, now]
    );
    
    // Insert default menu items
    const menuItems = [
      { id: 'm1', name: 'Bruschetta al Pomodoro', category: 'Antipasto', price: 8, cost: 2.5 },
      { id: 'm2', name: 'Caprese Salad', category: 'Antipasto', price: 10, cost: 4 },
      { id: 'm3', name: 'Spaghetti Carbonara', category: 'Primo', price: 15, cost: 4.5 },
      { id: 'm4', name: 'Lasagna alla Bolognese', category: 'Primo', price: 16, cost: 5 },
      { id: 'm5', name: 'Risotto ai Funghi', category: 'Primo', price: 14, cost: 5.5 },
      { id: 'm6', name: 'Bistecca alla Fiorentina', category: 'Secondo', price: 35, cost: 15 },
      { id: 'm7', name: 'Pollo alla Cacciatora', category: 'Secondo', price: 20, cost: 7 },
      { id: 'm8', name: 'Tiramisù', category: 'Dessert', price: 9, cost: 3 },
      { id: 'm9', name: 'Panna Cotta', category: 'Dessert', price: 8, cost: 2.5 },
      { id: 'm10', name: 'Vino Rosso (calice)', category: 'Bevanda', price: 7, cost: 2 },
      { id: 'm11', name: 'Acqua Minerale', category: 'Bevanda', price: 3, cost: 0.5 },
    ];
    
    // Get all locations and insert menu items for each
    const locations = await masterDbQuery('SELECT id FROM locations');
    for (const location of locations) {
      for (const item of menuItems) {
        await dbRun(location.id,
          'INSERT INTO menu_items (id, name, category, price, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [item.id, item.name, item.category, item.price, item.cost, now, now]
        );
      }
    }
    
    res.json({ success: true, message: 'Default data initialized' });
  } catch (error) {
    console.error('Failed to initialize default data', error);
    res.status(500).json({ error: 'Failed to initialize default data' });
  }
});

// User Management API (Admin only)
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await masterDbQuery(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_active, u.created_at,
             GROUP_CONCAT(ulp.location_id) as location_ids
      FROM users u
      LEFT JOIN user_location_permissions ulp ON u.id = ulp.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    
    const formattedUsers = users.map(user => ({
      ...user,
      locationIds: user.location_ids ? user.location_ids.split(',') : []
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Failed to get users', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.put('/api/users/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { locationIds } = req.body;
    
    // Remove existing permissions
    await masterDbRun('DELETE FROM user_location_permissions WHERE user_id = ?', [id]);
    
    // Add new permissions
    const now = new Date().toISOString();
    for (const locationId of locationIds) {
      const permissionId = crypto.randomUUID();
      await masterDbRun(
        'INSERT INTO user_location_permissions (id, user_id, location_id, created_at) VALUES (?, ?, ?, ?)',
        [permissionId, id, locationId, now]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update user permissions', error);
    res.status(500).json({ error: 'Failed to update user permissions' });
  }
});

app.put('/api/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    await masterDbRun('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?', 
      [isActive ? 1 : 0, new Date().toISOString(), id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update user status', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

app.put('/api/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Prevent admin from changing their own role
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    await masterDbRun('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', 
      [role, new Date().toISOString(), id]);
    
    // If user is promoted to admin, give them access to all locations
    if (role === 'admin') {
      // Remove existing permissions
      await masterDbRun('DELETE FROM user_location_permissions WHERE user_id = ?', [id]);
      
      // Get all active locations
      const locations = await masterDbQuery('SELECT id FROM locations WHERE status = "active"');
      
      // Add permissions for all locations
      const now = new Date().toISOString();
      for (const location of locations) {
        const permissionId = crypto.randomUUID();
        await masterDbRun(
          'INSERT INTO user_location_permissions (id, user_id, location_id, created_at) VALUES (?, ?, ?, ?)',
          [permissionId, id, location.id, now]
        );
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update user role', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists and is not the current admin
    const user = await masterDbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Delete user sessions
    await masterDbRun('DELETE FROM user_sessions WHERE user_id = ?', [id]);
    
    // Delete user permissions
    await masterDbRun('DELETE FROM user_location_permissions WHERE user_id = ?', [id]);
    
    // Delete user
    await masterDbRun('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await masterDbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    
    // Create user with specified role
    await masterDbRun(
      'INSERT INTO users (id, first_name, last_name, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, firstName, lastName, email, passwordHash, role || 'user', 1, now, now]
    );
    
    // If user is created as admin, give them access to all locations
    if (role === 'admin') {
      const locations = await masterDbQuery('SELECT id FROM locations WHERE status = "active"');
      for (const location of locations) {
        const permissionId = crypto.randomUUID();
        await masterDbRun(
          'INSERT INTO user_location_permissions (id, user_id, location_id, created_at) VALUES (?, ?, ?, ?)',
          [permissionId, userId, location.id, now]
        );
      }
    }
    
    res.json({ 
      success: true, 
      user: {
        id: userId,
        firstName,
        lastName,
        email,
        role: role || 'user'
      }
    });
  } catch (error) {
    console.error('Failed to create user', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Settings API (Admin only)
app.get('/api/settings/locations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const locations = await masterDbQuery('SELECT * FROM locations ORDER BY name');
    res.json(locations);
  } catch (error) {
    console.error('Failed to get locations for settings', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

app.post('/api/settings/locations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, capacity, openTime, closeTime } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await masterDbRun(
      'INSERT INTO locations (id, name, capacity, open_time, close_time, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, capacity, openTime, closeTime, 'active', now, now]
    );
    
    const location = await masterDbGet('SELECT * FROM locations WHERE id = ?', [id]);
    res.json(location);
  } catch (error) {
    console.error('Failed to create location', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

app.put('/api/settings/locations/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity, openTime, closeTime, status } = req.body;
    const now = new Date().toISOString();
    
    await masterDbRun(
      'UPDATE locations SET name = ?, capacity = ?, open_time = ?, close_time = ?, status = ?, updated_at = ? WHERE id = ?',
      [name, capacity, openTime, closeTime, status, now, id]
    );
    
    const location = await masterDbGet('SELECT * FROM locations WHERE id = ?', [id]);
    res.json(location);
  } catch (error) {
    console.error('Failed to update location', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

app.delete('/api/settings/locations/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete user permissions for this location
    await masterDbRun('DELETE FROM user_location_permissions WHERE location_id = ?', [id]);
    
    // Delete enabled tabs for this location
    await masterDbRun('DELETE FROM location_enabled_tabs WHERE location_id = ?', [id]);
    
    // Delete location
    await masterDbRun('DELETE FROM locations WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete location', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// Get enabled tabs for a location
app.get('/api/settings/locations/:id/tabs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const tabs = await masterDbQuery(`
      SELECT tab_name, is_enabled 
      FROM location_enabled_tabs 
      WHERE location_id = ? 
      ORDER BY tab_name
    `, [id]);
    
    res.json(tabs);
  } catch (error) {
    console.error('Failed to get location tabs', error);
    res.status(500).json({ error: 'Failed to get location tabs' });
  }
});

// Update enabled tabs for a location
app.put('/api/settings/locations/:id/tabs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tabs } = req.body;
    
    const now = new Date().toISOString();
    
    // Delete existing tabs for this location
    await masterDbRun('DELETE FROM location_enabled_tabs WHERE location_id = ?', [id]);
    
    // Insert new tabs
    for (const tab of tabs) {
      const tabId = crypto.randomUUID();
      await masterDbRun(
        'INSERT INTO location_enabled_tabs (id, location_id, tab_name, is_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [tabId, id, tab.tab_name, tab.is_enabled ? 1 : 0, now, now]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update location tabs', error);
    res.status(500).json({ error: 'Failed to update location tabs' });
  }
});

// Get user's accessible locations
app.get('/api/user/locations', requireAuth, async (req, res) => {
  try {
    let locations;
    
    if (req.user.role === 'admin') {
      // Admin can see all active locations
      locations = await masterDbQuery('SELECT * FROM locations WHERE status = "active" ORDER BY name');
    } else {
      // Regular users can only see locations they have permission for
      locations = await masterDbQuery(`
        SELECT l.* FROM locations l
        JOIN user_location_permissions ulp ON l.id = ulp.location_id
        WHERE ulp.user_id = ? AND l.status = 'active'
        ORDER BY l.name
      `, [req.user.id]);
    }
    
    res.json(locations);
  } catch (error) {
    console.error('Failed to get user locations', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

// Get enabled tabs for current user's location
app.get('/api/user/enabled-tabs/:locationId', requireAuth, async (req, res) => {
  try {
    const { locationId } = req.params;
    
    // Check if user has access to this location
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDbGet(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied to this location' });
      }
    }
    
    // Get enabled tabs for this location
    const enabledTabs = await masterDbQuery(`
      SELECT tab_name, is_enabled 
      FROM location_enabled_tabs 
      WHERE location_id = ? AND is_enabled = 1
      ORDER BY tab_name
    `, [locationId]);
    
    // If no custom tabs are set, return default enabled tabs
    if (enabledTabs.length === 0) {
      const defaultTabs = [
        { tab_name: 'dashboard', is_enabled: 1 },
        { tab_name: 'reservations', is_enabled: 1 },
        { tab_name: 'waitlist', is_enabled: 1 },
        { tab_name: 'tables', is_enabled: 1 },
        { tab_name: 'menu', is_enabled: 1 },
        { tab_name: 'sales', is_enabled: 1 },
        { tab_name: 'customers', is_enabled: 1 },
        { tab_name: 'financial-plan', is_enabled: 1 }
      ];
      res.json(defaultTabs);
    } else {
      res.json(enabledTabs);
    }
  } catch (error) {
    console.error('Failed to get enabled tabs', error);
    res.status(500).json({ error: 'Failed to get enabled tabs' });
  }
});

process.on('SIGINT', () => {
  masterDb.close();
  dbConnections.forEach(db => db.close());
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`RistoManager backend listening on port ${PORT}`);
});


