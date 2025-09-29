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
  db.run(`CREATE TABLE IF NOT EXISTS financial_plan_state (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/financial-plan/state', async (req, res) => {
  try {
    const state = await getState();
    if (!state) {
      res.json({
        preventivoOverrides: {},
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

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`RistoManager backend listening on port ${PORT}`);
});


