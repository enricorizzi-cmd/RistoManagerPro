const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 4000;
const DATABASE_FILE = process.env.DATABASE_FILE || path.join(__dirname, 'data', 'ristomanager.db');
const DEFAULT_STATE_ID = 'financial-plan-global';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

fs.mkdirSync(path.dirname(DATABASE_FILE), { recursive: true });

const db = new sqlite3.Database(DATABASE_FILE);

db.serialize(() => {
  // Financial Plan State Table
  db.run(`CREATE TABLE IF NOT EXISTS financial_plan_state (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  // Locations Table
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  // Reservations Table
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

  // Tables Table
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

  // Waitlist Table
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

  // Menu Items Table
  db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    cost REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  // Sales Table
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    location_id TEXT NOT NULL,
    reservation_id TEXT,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
  )`);

  // Business Plan Drafts Table
  db.run(`CREATE TABLE IF NOT EXISTS business_plan_drafts (
    id TEXT PRIMARY KEY,
    target_year INTEGER NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
});

function getState() {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT data FROM financial_plan_state WHERE id = ?',
      [DEFAULT_STATE_ID],
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

function saveState(payload) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const data = JSON.stringify(payload);
    db.run(
      `INSERT INTO financial_plan_state (id, data, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      [DEFAULT_STATE_ID, data, now],
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

// Database helper functions
function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/financial-plan/state', async (req, res) => {
  try {
    const state = await getState();
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
    const payload = buildPayload(req.body);
    const updatedAt = await saveState(payload);
    res.json({ success: true, updatedAt });
  } catch (error) {
    console.error('Failed to save financial plan state', error);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

// Locations API
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await dbQuery('SELECT * FROM locations ORDER BY name');
    res.json(locations);
  } catch (error) {
    console.error('Failed to get locations', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

app.put('/api/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity, openTime, closeTime } = req.body;
    const now = new Date().toISOString();
    
    await dbRun(
      'UPDATE locations SET name = ?, capacity = ?, open_time = ?, close_time = ?, updated_at = ? WHERE id = ?',
      [name, capacity, openTime, closeTime, now, id]
    );
    
    const location = await dbGet('SELECT * FROM locations WHERE id = ?', [id]);
    res.json(location);
  } catch (error) {
    console.error('Failed to update location', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Reservations API
app.get('/api/reservations/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const reservations = await dbQuery(
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
    
    await dbRun(
      'INSERT INTO reservations (id, location_id, guest_name, party_size, reservation_time, status, phone, email, notes, table_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, locationId, guestName, partySize, reservationTime, 'confirmed', phone, email, notes, tableId, now, now]
    );
    
    const reservation = await dbGet('SELECT * FROM reservations WHERE id = ?', [id]);
    res.json(reservation);
  } catch (error) {
    console.error('Failed to create reservation', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

app.put('/api/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const now = new Date().toISOString();
    
    await dbRun(
      'UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, id]
    );
    
    const reservation = await dbGet('SELECT * FROM reservations WHERE id = ?', [id]);
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
    const tables = await dbQuery(
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
    
    const updatedTables = await dbQuery('SELECT * FROM tables WHERE location_id = ?', [locationId]);
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
    const waitlist = await dbQuery(
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
app.get('/api/menu-items', async (req, res) => {
  try {
    const menuItems = await dbQuery('SELECT * FROM menu_items ORDER BY category, name');
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
    const sales = await dbQuery(
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
    const drafts = await dbQuery('SELECT * FROM business_plan_drafts ORDER BY target_year');
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
    const { targetYear, data } = req.body;
    const now = new Date().toISOString();
    const id = `draft-${targetYear}`;
    
    await dbRun(
      'INSERT INTO business_plan_drafts (id, target_year, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
      [id, targetYear, JSON.stringify(data), now, now]
    );
    
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
    const existingLocations = await dbQuery('SELECT COUNT(*) as count FROM locations');
    if (existingLocations[0].count > 0) {
      res.json({ message: 'Default data already exists' });
      return;
    }
    
    // Insert default locations
    await dbRun(
      'INSERT INTO locations (id, name, capacity, open_time, close_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['loc-1', 'Trattoria del Ponte', 50, '18:00', '23:00', now, now]
    );
    
    await dbRun(
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
    
    for (const item of menuItems) {
      await dbRun(
        'INSERT INTO menu_items (id, name, category, price, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [item.id, item.name, item.category, item.price, item.cost, now, now]
      );
    }
    
    res.json({ success: true, message: 'Default data initialized' });
  } catch (error) {
    console.error('Failed to initialize default data', error);
    res.status(500).json({ error: 'Failed to initialize default data' });
  }
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`RistoManager backend listening on port ${PORT}`);
});


