const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { masterDb, getLocationDb } = require('./supabase-wrapper');
const {
  parseExcelFile,
  validateParsedData,
  normalizeDishName,
  normalizeCategoryName,
} = require('./excel-parser');

const PORT = process.env.PORT || 4000;

const app = express();

// CORS configuration for Render deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow all origins in production (Render)
    // In production, Render serves both frontend and backend from same origin
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }

    // In development, allow localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Location-Id'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
    ];
    if (
      allowedMimes.includes(file.mimetype) ||
      file.originalname.match(/\.(xls|xlsx|xlt)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Formato file non supportato. Usa .xls, .xlsx o .xlt'));
    }
  },
});

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body).substring(0, 200));
  }
  next();
});

// Serve static files from dist directory (frontend build)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Database wrapper functions - now using Supabase instead of SQLite
const getDatabase = locationId => {
  return getLocationDb(locationId);
};

// Authentication utilities
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware to check authentication
async function requireAuth(req, res, next) {
  const token =
    req.headers.authorization?.replace('Bearer ', '') || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Get session with token
    const session = await masterDb.get(
      'SELECT * FROM user_sessions WHERE token = ?',
      [token]
    );

    if (!session) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user
    const user = await masterDb.get(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [session.user_id]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to check admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Multi-company state management
async function getState(locationId) {
  try {
    const db = getDatabase(locationId);
    const stateId = `financial-plan-${locationId}`;
    const row = await db.get(
      'SELECT data FROM financial_plan_state WHERE id = ?',
      [stateId]
    );

    if (!row) {
      return null;
    }

    try {
      const parsed =
        typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      return parsed;
    } catch (parseError) {
      throw parseError;
    }
  } catch (error) {
    console.error('Error getting state:', error);
    throw error;
  }
}

// Function to aggregate financial data across all locations
async function aggregateFinancialData(payload, locationId) {
  try {
    // Skip aggregation if this is already for "all" location
    if (locationId === 'all') return;

    // Get all active locations (excluding "all")
    const allLocations = await masterDbQuery(
      'SELECT id FROM locations WHERE status = ?',
      ['active']
    );
    const locations = allLocations.filter(loc => loc.id !== 'all');

    // Get current aggregated state for "all"
    const allDb = getDatabase('all');
    const aggregatedStateId = 'financial-plan-all';

    const row = await allDb.get(
      'SELECT data FROM financial_plan_state WHERE id = ?',
      [aggregatedStateId]
    );

    let aggregatedPayload = {
      preventivoOverrides: {},
      consuntivoOverrides: {},
      manualLog: [],
      monthlyMetrics: [],
      statsOverrides: {},
      causaliCatalog: [],
      causaliVersion: null,
    };

    if (row) {
      try {
        const parsed =
          typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        aggregatedPayload = parsed;
      } catch (parseError) {
        console.error('Error parsing aggregated state:', parseError);
      }
    }

    // Aggregate data from all locations
    for (const location of locations) {
      try {
        const locationStateId = `financial-plan-${location.id}`;
        const locationRow = await dbGet(
          location.id,
          'SELECT data FROM financial_plan_state WHERE id = ?',
          [locationStateId]
        );

        if (locationRow) {
          try {
            const locationData =
              typeof locationRow.data === 'string'
                ? JSON.parse(locationRow.data)
                : locationRow.data;

            // Aggregate preventivoOverrides
            if (locationData.preventivoOverrides) {
              Object.keys(locationData.preventivoOverrides).forEach(key => {
                if (!aggregatedPayload.preventivoOverrides[key]) {
                  aggregatedPayload.preventivoOverrides[key] = {};
                }
                Object.keys(locationData.preventivoOverrides[key]).forEach(
                  subKey => {
                    const currentValue =
                      aggregatedPayload.preventivoOverrides[key][subKey] || 0;
                    const newValue =
                      locationData.preventivoOverrides[key][subKey] || 0;
                    aggregatedPayload.preventivoOverrides[key][subKey] =
                      currentValue + newValue;
                  }
                );
              });
            }

            // Aggregate consuntivoOverrides
            if (locationData.consuntivoOverrides) {
              Object.keys(locationData.consuntivoOverrides).forEach(key => {
                if (!aggregatedPayload.consuntivoOverrides[key]) {
                  aggregatedPayload.consuntivoOverrides[key] = {};
                }
                Object.keys(locationData.consuntivoOverrides[key]).forEach(
                  subKey => {
                    const currentValue =
                      aggregatedPayload.consuntivoOverrides[key][subKey] || 0;
                    const newValue =
                      locationData.consuntivoOverrides[key][subKey] || 0;
                    aggregatedPayload.consuntivoOverrides[key][subKey] =
                      currentValue + newValue;
                  }
                );
              });
            }

            // Aggregate statsOverrides
            if (locationData.statsOverrides) {
              Object.keys(locationData.statsOverrides).forEach(key => {
                const currentValue = aggregatedPayload.statsOverrides[key] || 0;
                const newValue = locationData.statsOverrides[key] || 0;
                aggregatedPayload.statsOverrides[key] = currentValue + newValue;
              });
            }

            // Aggregate monthlyMetrics
            if (locationData.monthlyMetrics) {
              locationData.monthlyMetrics.forEach(metric => {
                const existingMetric = aggregatedPayload.monthlyMetrics.find(
                  m =>
                    m.year === metric.year && m.monthIndex === metric.monthIndex
                );
                if (existingMetric) {
                  // Sum numeric values
                  Object.keys(metric).forEach(key => {
                    if (typeof metric[key] === 'number') {
                      existingMetric[key] =
                        (existingMetric[key] || 0) + metric[key];
                    }
                  });
                } else {
                  aggregatedPayload.monthlyMetrics.push({ ...metric });
                }
              });
            }
          } catch (parseError) {
            console.error(
              `Error parsing location ${location.id} data:`,
              parseError
            );
          }
        }
      } catch (error) {
        console.error(`Error processing location ${location.id}:`, error);
      }
    }

    // Save aggregated state using Supabase
    const { supabaseCall } = require('./supabase-wrapper');
    const now = new Date().toISOString();
    const aggregatedData = JSON.stringify(aggregatedPayload);

    await supabaseCall('POST', 'financial_plan_state', {
      data: {
        id: aggregatedStateId,
        location_id: 'all',
        data: aggregatedData,
        updated_at: now,
      },
      upsert: true,
    });

    console.log('Successfully updated aggregated financial data');
  } catch (error) {
    console.error('Error in aggregateFinancialData:', error);
  }
}

async function saveState(payload, locationId) {
  try {
    const { supabaseCall } = require('./supabase-wrapper');
    const now = new Date().toISOString();
    const data = JSON.stringify(payload);
    const stateId = `financial-plan-${locationId}`;

    // Upsert using Supabase REST API directly
    await supabaseCall('POST', 'financial_plan_state', {
      data: {
        id: stateId,
        location_id: locationId,
        data: data,
        updated_at: now,
      },
      upsert: true,
    });

    // Trigger aggregation for "all" location
    await aggregateFinancialData(payload, locationId);

    return now;
  } catch (error) {
    console.error('Error saving state:', error);
    throw error;
  }
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

  if (
    body.preventivoOverrides &&
    typeof body.preventivoOverrides === 'object'
  ) {
    payload.preventivoOverrides = body.preventivoOverrides;
  }
  if (
    body.consuntivoOverrides &&
    typeof body.consuntivoOverrides === 'object'
  ) {
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

// Multi-company database helper functions - now using Supabase
async function dbQuery(locationId, sql, params = []) {
  const db = getDatabase(locationId);
  return await db.query(sql, params);
}

async function dbGet(locationId, sql, params = []) {
  const db = getDatabase(locationId);
  return await db.get(sql, params);
}

async function dbRun(locationId, sql, params = []) {
  const db = getDatabase(locationId);
  return await db.run(sql, params);
}

// Master database functions (for locations) - now using Supabase
async function masterDbQuery(sql, params = []) {
  return await masterDb.query(sql, params);
}

async function masterDbGet(sql, params = []) {
  return await masterDb.get(sql, params);
}

async function masterDbRun(sql, params = []) {
  return await masterDb.run(sql, params);
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
    const existingUser = await masterDbGet(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check if this is the first user (make them admin)
    const userCount = await masterDbQuery(
      'SELECT COUNT(*) as count FROM users'
    );
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
        role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`[LOGIN] Attempt for email: ${email}`);

    if (!email || !password) {
      console.log('[LOGIN] Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const passwordHash = hashPassword(password);
    console.log('[LOGIN] Password hashed, querying database...');

    let user;
    try {
      user = await masterDbGet(
        'SELECT id, first_name, last_name, email, role FROM users WHERE email = ? AND password_hash = ? AND is_active = 1',
        [email, passwordHash]
      );
      console.log(
        `[LOGIN] Database query result:`,
        user ? 'User found' : 'User not found'
      );
    } catch (dbError) {
      console.error('[LOGIN] Database error:', dbError);
      console.error(
        '[LOGIN] Database error details:',
        dbError.message,
        dbError.stack
      );
      return res.status(500).json({
        error: 'Database connection failed',
        details: dbError.message,
        type: 'database_error',
      });
    }

    if (!user) {
      console.log('[LOGIN] Invalid credentials');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`[LOGIN] User found: ${user.email}, creating session...`);

    // Create new session
    const token = generateToken();
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await masterDbRun(
        'INSERT INTO user_sessions (id, user_id, token, created_at) VALUES (?, ?, ?, ?)',
        [sessionId, user.id, token, now]
      );
      console.log('[LOGIN] Session created successfully');
    } catch (sessionError) {
      console.error('[LOGIN] Session creation error:', sessionError);
      return res.status(500).json({
        error: 'Failed to create session',
        details: sessionError.message,
      });
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[LOGIN] Unexpected error:', error);
    console.error('[LOGIN] Error details:', error.message, error.stack);
    res.status(500).json({
      error: 'Login failed',
      details: error.message,
      type: 'unexpected_error',
    });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await masterDbRun('DELETE FROM user_sessions WHERE token = ?', [
      req.headers.authorization?.replace('Bearer ', ''),
    ]);
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
      role: req.user.role,
    },
  });
});

app.get('/api/financial-plan/state', requireAuth, async (req, res) => {
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

app.put('/api/financial-plan/state', requireAuth, async (req, res) => {
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

// Initialize "Tutti" location for aggregated data
const initializeTuttiLocation = async () => {
  try {
    const existingTutti = await masterDbGet(
      'SELECT * FROM locations WHERE id = ?',
      ['all']
    );
    if (!existingTutti) {
      const now = new Date().toISOString();
      await masterDbRun(
        'INSERT INTO locations (id, name, capacity, open_time, close_time, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['all', 'Tutti', 0, '00:00', '23:59', 'active', now, now]
      );
      console.log('Created "Tutti" location for aggregated data');
    }
  } catch (error) {
    console.error('Failed to initialize Tutti location:', error);
  }
};

// Initialize Tutti location on server start
initializeTuttiLocation();

// Locations API (Master database - shared across companies)
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await masterDbQuery(
      'SELECT * FROM locations ORDER BY name'
    );
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

    const location = await masterDbGet('SELECT * FROM locations WHERE id = ?', [
      id,
    ]);
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

    const location = await masterDbGet('SELECT * FROM locations WHERE id = ?', [
      id,
    ]);
    res.json(location);
  } catch (error) {
    console.error('Failed to update location', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Business Plan Drafts API
app.get('/api/business-plan-drafts', requireAuth, async (req, res) => {
  try {
    const locationId = req.query.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    const db = getDatabase(locationId);
    console.log('[BUSINESS_PLAN] Querying drafts for location:', locationId);
    const drafts = await db.query(
      'SELECT * FROM business_plan_drafts ORDER BY target_year, name'
    );
    console.log('[BUSINESS_PLAN] Found drafts:', drafts?.length || 0);

    const draftsList = drafts.map(draft => ({
      id: draft.id,
      targetYear: draft.target_year,
      name: draft.name,
      data:
        typeof draft.data === 'string' ? JSON.parse(draft.data) : draft.data,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
    }));
    res.json(draftsList);
  } catch (error) {
    console.error('Failed to get business plan drafts', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to get business plan drafts',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

app.put('/api/business-plan-drafts', requireAuth, async (req, res) => {
  try {
    const { targetYear, name, data, locationId } = req.body;
    if (!locationId || !name) {
      return res
        .status(400)
        .json({ error: 'Location ID and name are required' });
    }

    const now = new Date().toISOString();
    const id = `draft-${targetYear}-${name.replace(/[^a-zA-Z0-9]/g, '-')}`;

    // Upsert business plan draft using Supabase
    const { supabaseCall } = require('./supabase-wrapper');
    await supabaseCall('POST', 'business_plan_drafts', {
      data: {
        id,
        location_id: locationId,
        target_year: targetYear,
        name,
        data: JSON.stringify(data),
        created_at: now,
        updated_at: now,
      },
      upsert: true,
    });

    res.json({ success: true, id });
  } catch (error) {
    console.error('Failed to save business plan draft', error);
    res.status(500).json({ error: 'Failed to save business plan draft' });
  }
});

app.delete('/api/business-plan-drafts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { locationId } = req.query;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    const db = getDatabase(locationId);
    await db.run('DELETE FROM business_plan_drafts WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete business plan draft', error);
    res.status(500).json({ error: 'Failed to delete business plan draft' });
  }
});

// Initialize default data
app.post('/api/init-default-data', async (req, res) => {
  try {
    const now = new Date().toISOString();

    // Check if data already exists
    const existingLocations = await masterDbQuery(
      'SELECT COUNT(*) as count FROM locations'
    );
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

    res.json({ success: true, message: 'Default data initialized' });
  } catch (error) {
    console.error('Failed to initialize default data', error);
    res.status(500).json({ error: 'Failed to initialize default data' });
  }
});

// User Management API (Admin only)
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get all users
    const users = await masterDbQuery(
      'SELECT id, first_name, last_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    // Get all permissions and group by user_id
    const permissions = await masterDbQuery(
      'SELECT user_id, location_id FROM user_location_permissions'
    );

    // Group permissions by user_id
    const permissionsByUser = {};
    permissions.forEach(perm => {
      if (!permissionsByUser[perm.user_id]) {
        permissionsByUser[perm.user_id] = [];
      }
      permissionsByUser[perm.user_id].push(perm.location_id);
    });

    // Format users with location_ids
    const formattedUsers = users.map(user => ({
      ...user,
      locationIds: permissionsByUser[user.id] || [],
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Failed to get users', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.put(
  '/api/users/:id/permissions',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { locationIds } = req.body;

      // Remove existing permissions
      await masterDbRun(
        'DELETE FROM user_location_permissions WHERE user_id = ?',
        [id]
      );

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
  }
);

app.put(
  '/api/users/:id/status',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      await masterDbRun(
        'UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?',
        [isActive ? 1 : 0, new Date().toISOString(), id]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update user status', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }
);

app.put('/api/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Prevent admin from changing their own role
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    await masterDbRun(
      'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
      [role, new Date().toISOString(), id]
    );

    // If user is promoted to admin, give them access to all locations
    if (role === 'admin') {
      // Remove existing permissions
      await masterDbRun(
        'DELETE FROM user_location_permissions WHERE user_id = ?',
        [id]
      );

      // Get all active locations
      const locations = await masterDbQuery(
        'SELECT id FROM locations WHERE status = "active"'
      );

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
    await masterDbRun(
      'DELETE FROM user_location_permissions WHERE user_id = ?',
      [id]
    );

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
    const existingUser = await masterDbGet(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingUser) {
      return res
        .status(400)
        .json({ error: 'User with this email already exists' });
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    // Create user with specified role
    await masterDbRun(
      'INSERT INTO users (id, first_name, last_name, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        firstName,
        lastName,
        email,
        passwordHash,
        role || 'user',
        1,
        now,
        now,
      ]
    );

    // If user is created as admin, give them access to all locations
    if (role === 'admin') {
      const locations = await masterDbQuery(
        'SELECT id FROM locations WHERE status = "active"'
      );
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
        role: role || 'user',
      },
    });
  } catch (error) {
    console.error('Failed to create user', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Settings API (Admin only)
app.get(
  '/api/settings/locations',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const locations = await masterDbQuery(
        'SELECT * FROM locations ORDER BY name'
      );
      res.json(locations);
    } catch (error) {
      console.error('Failed to get locations for settings', error);
      res.status(500).json({ error: 'Failed to get locations' });
    }
  }
);

app.post(
  '/api/settings/locations',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { name, capacity, openTime, closeTime } = req.body;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await masterDbRun(
        'INSERT INTO locations (id, name, capacity, open_time, close_time, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, capacity, openTime, closeTime, 'active', now, now]
      );

      const location = await masterDbGet(
        'SELECT * FROM locations WHERE id = ?',
        [id]
      );
      res.json(location);
    } catch (error) {
      console.error('Failed to create location', error);
      res.status(500).json({ error: 'Failed to create location' });
    }
  }
);

app.put(
  '/api/settings/locations/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, capacity, openTime, closeTime, status } = req.body;
      const now = new Date().toISOString();

      await masterDbRun(
        'UPDATE locations SET name = ?, capacity = ?, open_time = ?, close_time = ?, status = ?, updated_at = ? WHERE id = ?',
        [name, capacity, openTime, closeTime, status, now, id]
      );

      const location = await masterDbGet(
        'SELECT * FROM locations WHERE id = ?',
        [id]
      );
      res.json(location);
    } catch (error) {
      console.error('Failed to update location', error);
      res.status(500).json({ error: 'Failed to update location' });
    }
  }
);

app.delete(
  '/api/settings/locations/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Delete user permissions for this location
      await masterDbRun(
        'DELETE FROM user_location_permissions WHERE location_id = ?',
        [id]
      );

      // Delete enabled tabs for this location
      await masterDbRun(
        'DELETE FROM location_enabled_tabs WHERE location_id = ?',
        [id]
      );

      // Delete location
      await masterDbRun('DELETE FROM locations WHERE id = ?', [id]);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete location', error);
      res.status(500).json({ error: 'Failed to delete location' });
    }
  }
);

// Get enabled tabs for a location
app.get(
  '/api/settings/locations/:id/tabs',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const tabs = await masterDbQuery(
        `
      SELECT tab_name, is_enabled 
      FROM location_enabled_tabs 
      WHERE location_id = ? 
      ORDER BY tab_name
    `,
        [id]
      );

      res.json(tabs);
    } catch (error) {
      console.error('Failed to get location tabs', error);
      res.status(500).json({ error: 'Failed to get location tabs' });
    }
  }
);

// Update enabled tabs for a location
app.put(
  '/api/settings/locations/:id/tabs',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { tabs } = req.body;

      const now = new Date().toISOString();

      // Delete existing tabs for this location
      await masterDbRun(
        'DELETE FROM location_enabled_tabs WHERE location_id = ?',
        [id]
      );

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
  }
);

// Get user's accessible locations
app.get('/api/user/locations', requireAuth, async (req, res) => {
  try {
    let locations;

    if (req.user.role === 'admin') {
      // Admin can see all active locations
      locations = await masterDbQuery(
        'SELECT * FROM locations WHERE status = "active" ORDER BY name'
      );
    } else {
      // Regular users can only see locations they have permission for
      // Get user's permissions first
      const permissions = await masterDbQuery(
        'SELECT location_id FROM user_location_permissions WHERE user_id = ?',
        [req.user.id]
      );

      if (permissions.length === 0) {
        locations = [];
      } else {
        const locationIds = permissions.map(p => p.location_id);
        // Get locations for these IDs
        const allLocations = await masterDbQuery(
          'SELECT * FROM locations WHERE status = ?',
          ['active']
        );
        locations = allLocations.filter(loc => locationIds.includes(loc.id));
        locations.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    res.json(locations);
  } catch (error) {
    console.error('Failed to get user locations', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

// Get user's accessible locations for financial plan (includes "Tutti" for admin)
app.get('/api/user/locations/financial-plan', requireAuth, async (req, res) => {
  try {
    let locations;

    if (req.user.role === 'admin') {
      // Admin can see all active locations + "Tutti" for aggregated view
      locations = await masterDbQuery(
        'SELECT * FROM locations WHERE status = "active" ORDER BY name'
      );
    } else {
      // Regular users can only see locations they have permission for
      // Get user's permissions first
      const permissions = await masterDbQuery(
        'SELECT location_id FROM user_location_permissions WHERE user_id = ?',
        [req.user.id]
      );

      if (permissions.length === 0) {
        locations = [];
      } else {
        const locationIds = permissions.map(p => p.location_id);
        // Get locations for these IDs
        const allLocations = await masterDbQuery(
          'SELECT * FROM locations WHERE status = ?',
          ['active']
        );
        locations = allLocations.filter(loc => locationIds.includes(loc.id));
        locations.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    res.json(locations);
  } catch (error) {
    console.error('Failed to get user locations for financial plan', error);
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
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    // Get enabled tabs for this location
    const enabledTabs = await masterDbQuery(
      `
      SELECT tab_name, is_enabled 
      FROM location_enabled_tabs 
      WHERE location_id = ? AND is_enabled = 1
      ORDER BY tab_name
    `,
      [locationId]
    );

    // If no custom tabs are set, return default enabled tabs
    if (enabledTabs.length === 0) {
      const defaultTabs = [{ tab_name: 'financial-plan', is_enabled: 1 }];
      res.json(defaultTabs);
    } else {
      res.json(enabledTabs);
    }
  } catch (error) {
    console.error('Failed to get enabled tabs', error);
    res.status(500).json({ error: 'Failed to get enabled tabs' });
  }
});

// Data entries API for InserisciDati
app.get('/api/data-entries/:locationId', requireAuth, async (req, res) => {
  try {
    const { locationId } = req.params;

    // Check if user has access to this location
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDbGet(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );

      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    const db = getDatabase(locationId);
    const entries = await dbQuery(
      locationId,
      `
      SELECT * FROM data_entries 
      WHERE location_id = ? 
      ORDER BY created_at DESC
    `,
      [locationId]
    );

    res.json(entries);
  } catch (error) {
    console.error('Failed to get data entries', error);
    res.status(500).json({ error: 'Failed to get data entries' });
  }
});

app.post('/api/data-entries/:locationId', requireAuth, async (req, res) => {
  try {
    const { locationId } = req.params;
    const {
      dataInserimento,
      mese,
      anno,
      tipologiaCausale,
      categoria,
      causale,
      valore,
    } = req.body;

    // Check if user has access to this location
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDbGet(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );

      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    const db = getDatabase(locationId);
    const entryId = crypto.randomUUID();
    const now = new Date().toISOString();

    await dbRun(
      locationId,
      `
      INSERT INTO data_entries (
        id, location_id, data_inserimento, mese, anno, 
        tipologia_causale, categoria, causale, valore, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        entryId,
        locationId,
        dataInserimento,
        mese,
        anno,
        tipologiaCausale,
        categoria,
        causale,
        valore,
        now,
        now,
      ]
    );

    res.json({ success: true, id: entryId });
  } catch (error) {
    console.error('Failed to create data entry', error);
    res.status(500).json({ error: 'Failed to create data entry' });
  }
});

app.put(
  '/api/data-entries/:locationId/:entryId',
  requireAuth,
  async (req, res) => {
    try {
      const { locationId, entryId } = req.params;
      const {
        dataInserimento,
        mese,
        anno,
        tipologiaCausale,
        categoria,
        causale,
        valore,
      } = req.body;

      // Check if user has access to this location
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDbGet(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );

        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const db = getDatabase(locationId);
      const now = new Date().toISOString();

      await dbRun(
        locationId,
        `
      UPDATE data_entries SET
        data_inserimento = ?, mese = ?, anno = ?, 
        tipologia_causale = ?, categoria = ?, causale = ?, valore = ?,
        updated_at = ?
      WHERE id = ? AND location_id = ?
    `,
        [
          dataInserimento,
          mese,
          anno,
          tipologiaCausale,
          categoria,
          causale,
          valore,
          now,
          entryId,
          locationId,
        ]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update data entry', error);
      res.status(500).json({ error: 'Failed to update data entry' });
    }
  }
);

app.delete(
  '/api/data-entries/:locationId/:entryId',
  requireAuth,
  async (req, res) => {
    try {
      const { locationId, entryId } = req.params;

      // Check if user has access to this location
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDbGet(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );

        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const db = getDatabase(locationId);

      await dbRun(
        locationId,
        `
      DELETE FROM data_entries 
      WHERE id = ? AND location_id = ?
    `,
        [entryId, locationId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete data entry', error);
      res.status(500).json({ error: 'Failed to delete data entry' });
    }
  }
);

// Get data entries sums for Piano Mensile
app.get('/api/data-entries/:locationId/sums', requireAuth, async (req, res) => {
  try {
    const { locationId } = req.params;

    // Check if user has access to this location
    if (req.user.role !== 'admin') {
      // For "all" location, only admin can access
      if (locationId === 'all') {
        return res
          .status(403)
          .json({ error: 'Access denied to aggregated view' });
      }

      const hasPermission = await masterDbGet(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );

      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    // If locationId is "all", aggregate data from all active locations
    if (locationId === 'all') {
      const locations = await masterDbQuery(
        'SELECT id FROM locations WHERE status = "active" AND id != "all"'
      );
      const aggregatedSums = new Map();

      for (const location of locations) {
        try {
          const locationSums = await dbQuery(
            location.id,
            `
            SELECT 
              tipologia_causale,
              categoria,
              causale,
              anno,
              mese,
              SUM(valore) as total_value
            FROM data_entries 
            WHERE location_id = ? 
            GROUP BY tipologia_causale, categoria, causale, anno, mese
          `,
            [location.id]
          );

          // Aggregate sums by key
          locationSums.forEach(sum => {
            const key = `${sum.tipologia_causale}|${sum.categoria}|${sum.causale}|${sum.anno}|${sum.mese}`;
            if (aggregatedSums.has(key)) {
              aggregatedSums.get(key).total_value += sum.total_value;
            } else {
              aggregatedSums.set(key, { ...sum });
            }
          });
        } catch (error) {
          console.error(
            `Error aggregating data entries for location ${location.id}:`,
            error
          );
        }
      }

      const result = Array.from(aggregatedSums.values()).sort(
        (a, b) => b.anno - a.anno || b.mese - a.mese
      );
      res.json(result);
      return;
    }

    // Single location query
    const db = getDatabase(locationId);
    const sums = await dbQuery(
      locationId,
      `
      SELECT 
        tipologia_causale,
        categoria,
        causale,
        anno,
        mese,
        SUM(valore) as total_value
      FROM data_entries 
      WHERE location_id = ? 
      GROUP BY tipologia_causale, categoria, causale, anno, mese
      ORDER BY anno DESC, mese DESC
    `,
      [locationId]
    );

    res.json(sums);
  } catch (error) {
    console.error('Failed to get data entries sums', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to get data entries sums',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Financial Stats API
app.get('/api/financial-stats', requireAuth, async (req, res) => {
  try {
    const locationId = req.query.locationId;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Check if user has access to this location
    if (req.user.role !== 'admin') {
      // For "all" location, only admin can access
      if (locationId === 'all') {
        return res
          .status(403)
          .json({ error: 'Access denied to aggregated view' });
      }

      const hasPermission = await masterDbGet(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );

      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    // If locationId is "all", aggregate financial stats from all active locations
    if (locationId === 'all') {
      const locations = await masterDbQuery(
        'SELECT id FROM locations WHERE status = "active" AND id != "all"'
      );
      const aggregatedStats = new Map();

      for (const location of locations) {
        try {
          const locationStats = await dbQuery(
            location.id,
            `
            SELECT 
              month,
              fatturato_totale as fatturatoTotale,
              fatturato_imponibile as fatturatoImponibile,
              fatturato_previsionale as fatturatoPrevisionale,
              incassato,
              incassato_previsionale as incassatoPrevisionale,
              utile,
              utile_previsionale as utilePrevisionale,
              debiti_fornitore as debitiFornitore,
              debiti_bancari as debitiBancari
            FROM financial_stats 
            WHERE location_id = ? 
            ORDER BY month
          `,
            [location.id]
          );

          // Aggregate stats by month
          locationStats.forEach(stat => {
            if (aggregatedStats.has(stat.month)) {
              const existing = aggregatedStats.get(stat.month);
              existing.fatturatoTotale =
                (existing.fatturatoTotale || 0) + (stat.fatturatoTotale || 0);
              existing.fatturatoImponibile =
                (existing.fatturatoImponibile || 0) +
                (stat.fatturatoImponibile || 0);
              existing.fatturatoPrevisionale =
                (existing.fatturatoPrevisionale || 0) +
                (stat.fatturatoPrevisionale || 0);
              existing.incassato =
                (existing.incassato || 0) + (stat.incassato || 0);
              existing.incassatoPrevisionale =
                (existing.incassatoPrevisionale || 0) +
                (stat.incassatoPrevisionale || 0);
              existing.utile = (existing.utile || 0) + (stat.utile || 0);
              existing.utilePrevisionale =
                (existing.utilePrevisionale || 0) +
                (stat.utilePrevisionale || 0);
              existing.debitiFornitore =
                (existing.debitiFornitore || 0) + (stat.debitiFornitore || 0);
              existing.debitiBancari =
                (existing.debitiBancari || 0) + (stat.debitiBancari || 0);
            } else {
              aggregatedStats.set(stat.month, { ...stat });
            }
          });
        } catch (error) {
          console.error(
            `Error aggregating financial stats for location ${location.id}:`,
            error
          );
        }
      }

      const result = Array.from(aggregatedStats.values()).sort((a, b) =>
        a.month.localeCompare(b.month)
      );
      res.json(result);
      return;
    }

    // Single location query
    const db = getDatabase(locationId);
    const stats = await dbQuery(
      locationId,
      `
      SELECT 
        month,
        fatturato_totale as fatturatoTotale,
        fatturato_imponibile as fatturatoImponibile,
        fatturato_previsionale as fatturatoPrevisionale,
        incassato,
        incassato_previsionale as incassatoPrevisionale,
        utile,
        utile_previsionale as utilePrevisionale,
        debiti_fornitore as debitiFornitore,
        debiti_bancari as debitiBancari
      FROM financial_stats 
      WHERE location_id = ? 
      ORDER BY month
    `,
      [locationId]
    );

    res.json(stats);
  } catch (error) {
    console.error('Failed to get financial stats', error);
    res.status(500).json({ error: 'Failed to get financial stats' });
  }
});

app.put('/api/financial-stats', requireAuth, async (req, res) => {
  try {
    const { locationId, stats } = req.body;

    if (!locationId || !Array.isArray(stats)) {
      return res
        .status(400)
        .json({ error: 'Location ID and stats array are required' });
    }

    // Check if user has access to this location
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDbGet(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );

      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    const db = getDatabase(locationId);
    const now = new Date().toISOString();

    // Clear existing stats for this location
    await dbRun(
      locationId,
      'DELETE FROM financial_stats WHERE location_id = ?',
      [locationId]
    );

    // Insert new stats
    for (const stat of stats) {
      const statId = crypto.randomUUID();
      await dbRun(
        locationId,
        `
        INSERT INTO financial_stats (
          id, location_id, month, fatturato_totale, fatturato_imponibile, 
          fatturato_previsionale, incassato, incassato_previsionale, 
          utile, utile_previsionale, debiti_fornitore, debiti_bancari,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          statId,
          locationId,
          stat.month,
          stat.fatturatoTotale || null,
          stat.fatturatoImponibile || null,
          stat.fatturatoPrevisionale || null,
          stat.incassato || null,
          stat.incassatoPrevisionale || null,
          stat.utile || null,
          stat.utilePrevisionale || null,
          stat.debitiFornitore || null,
          stat.debitiBancari || null,
          now,
          now,
        ]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save financial stats', error);
    res.status(500).json({ error: 'Failed to save financial stats' });
  }
});

// Endpoint to migrate default stats to database
app.post('/api/financial-stats/migrate', requireAuth, async (req, res) => {
  try {
    const { locationId } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Check if user has access to this location
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDbGet(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );

      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    // Default stats data (sample data for 2024)
    const defaultStats = [
      {
        month: 'Gen. 24',
        fatturatoImponibile: 15000.0,
        fatturatoTotale: 15000.0,
        incassato: 18000.0,
        saldoConto: 5000.0,
        saldoSecondoConto: 1000.0,
        saldoTotale: 6000.0,
        creditiPendenti: 2000.0,
        creditiScaduti: 500.0,
        debitiFornitore: 3000.0,
        debitiBancari: 1500.0,
      },
      {
        month: 'Feb. 24',
        fatturatoImponibile: 16000.0,
        fatturatoTotale: 16000.0,
        incassato: 19000.0,
        saldoConto: 5500.0,
        saldoSecondoConto: 1200.0,
        saldoTotale: 6700.0,
        creditiPendenti: 2200.0,
        creditiScaduti: 600.0,
        debitiFornitore: 3200.0,
        debitiBancari: 1600.0,
      },
      {
        month: 'Mar. 24',
        fatturatoImponibile: 17000.0,
        fatturatoTotale: 17000.0,
        incassato: 20000.0,
        saldoConto: 6000.0,
        saldoSecondoConto: 1400.0,
        saldoTotale: 7400.0,
        creditiPendenti: 2400.0,
        creditiScaduti: 700.0,
        debitiFornitore: 3400.0,
        debitiBancari: 1700.0,
      },
      {
        month: 'Apr. 24',
        fatturatoImponibile: 18000.0,
        fatturatoTotale: 18000.0,
        incassato: 21000.0,
        saldoConto: 6500.0,
        saldoSecondoConto: 1600.0,
        saldoTotale: 8100.0,
        creditiPendenti: 2600.0,
        creditiScaduti: 800.0,
        debitiFornitore: 3600.0,
        debitiBancari: 1800.0,
      },
      {
        month: 'Mag. 24',
        fatturatoImponibile: 19000.0,
        fatturatoTotale: 19000.0,
        incassato: 22000.0,
        saldoConto: 7000.0,
        saldoSecondoConto: 1800.0,
        saldoTotale: 8800.0,
        creditiPendenti: 2800.0,
        creditiScaduti: 900.0,
        debitiFornitore: 3800.0,
        debitiBancari: 1900.0,
      },
      {
        month: 'Giu. 24',
        fatturatoImponibile: 20000.0,
        fatturatoTotale: 20000.0,
        incassato: 23000.0,
        saldoConto: 7500.0,
        saldoSecondoConto: 2000.0,
        saldoTotale: 9500.0,
        creditiPendenti: 3000.0,
        creditiScaduti: 1000.0,
        debitiFornitore: 4000.0,
        debitiBancari: 2000.0,
      },
    ];

    const db = getDatabase(locationId);
    const now = new Date().toISOString();

    // Clear existing stats for this location
    await dbRun(
      locationId,
      'DELETE FROM financial_stats WHERE location_id = ?',
      [locationId]
    );

    // Insert default stats
    for (const stat of defaultStats) {
      const statId = crypto.randomUUID();
      await dbRun(
        locationId,
        `
        INSERT INTO financial_stats (
          id, location_id, month, fatturato_totale, fatturato_imponibile, 
          fatturato_previsionale, incassato, incassato_previsionale, 
          utile, utile_previsionale, debiti_fornitore, debiti_bancari,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          statId,
          locationId,
          stat.month,
          stat.fatturatoTotale || null,
          stat.fatturatoImponibile || null,
          null,
          stat.incassato || null,
          null,
          null,
          null,
          stat.debitiFornitore || null,
          stat.debitiBancari || null,
          now,
          now,
        ]
      );
    }

    res.json({
      success: true,
      message: `Migrated ${defaultStats.length} stats records for location ${locationId}`,
    });
  } catch (error) {
    console.error('Failed to migrate financial stats', error);
    res.status(500).json({ error: 'Failed to migrate financial stats' });
  }
});

// Calculate and save fatturatoTotale for existing records
app.post(
  '/api/financial-stats/calculate-fatturato-totale',
  requireAuth,
  async (req, res) => {
    try {
      const { locationId } = req.body;

      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      // Check if user has access to this location
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDbGet(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );

        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const db = getDatabase(locationId);
      const now = new Date().toISOString();

      // First, calculate fatturatoTotale in financial_plan_state statsOverrides
      console.log(
        '[CALCULATE_FATTURATO] Fetching financial plan state for location:',
        locationId
      );
      const stateResult = await dbGet(
        locationId,
        'SELECT * FROM financial_plan_state WHERE id = ?',
        [`financial-plan-${locationId}`]
      );
      console.log(
        '[CALCULATE_FATTURATO] State result:',
        stateResult ? 'found' : 'not found'
      );

      if (stateResult) {
        console.log(
          '[CALCULATE_FATTURATO] Parsing state data, type:',
          typeof stateResult.data
        );
        const stateData =
          typeof stateResult.data === 'string'
            ? JSON.parse(stateResult.data)
            : stateResult.data;
        const statsOverrides = stateData.statsOverrides || {};
        console.log(
          '[CALCULATE_FATTURATO] Stats overrides keys:',
          Object.keys(statsOverrides).length
        );

        let updatedCount = 0;

        // Calculate fatturatoTotale for all months that have fatturatoImponibile
        Object.keys(statsOverrides).forEach(key => {
          if (key.includes('|fatturatoImponibile')) {
            const monthKey = key.split('|')[0];
            const fatturatoImponibile = statsOverrides[key] || 0;
            const corrispettivi =
              statsOverrides[`${monthKey}|corrispettivi`] || 0;
            const fatturatoTotale = fatturatoImponibile + corrispettivi;

            statsOverrides[`${monthKey}|fatturatoTotale`] = fatturatoTotale;
            updatedCount++;
          }
        });

        // Save updated state
        await dbRun(
          locationId,
          'UPDATE financial_plan_state SET data = ?, updated_at = ? WHERE id = ?',
          [JSON.stringify(stateData), now, `financial-plan-${locationId}`]
        );

        res.json({
          success: true,
          message: `Fatturato totale calculated successfully in statsOverrides`,
          updatedRecords: updatedCount,
        });
      } else {
        res.json({
          success: true,
          message: 'No financial plan state found',
          updatedRecords: 0,
        });
      }
    } catch (error) {
      console.error('Error calculating fatturato totale:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        error: 'Failed to calculate fatturato totale',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
);

// Chatbot API endpoint - Expert assistant for RistoManager Pro
app.post('/api/chatbot', requireAuth, async (req, res) => {
  try {
    const { message, locationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Check if user has access to this location
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDbGet(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );

      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    // ===== RECUPERO DATI COMPLETI DAL DATABASE =====

    // 1. Get financial plan state
    const stateResult = await dbGet(
      locationId,
      'SELECT * FROM financial_plan_state WHERE id = ?',
      [`financial-plan-${locationId}`]
    );

    let financialPlanData = null;
    let availableYears = [];

    if (stateResult) {
      financialPlanData =
        typeof stateResult.data === 'string'
          ? JSON.parse(stateResult.data)
          : stateResult.data;

      availableYears = financialPlanData.availableYears || [];
    }

    // 2. Get ALL financial stats (not just last 12)
    // Use correct column names from database (snake_case)
    let allStats = [];
    try {
      allStats = await dbQuery(
        locationId,
        `SELECT 
          month,
          fatturato_totale as fatturatoTotale,
          fatturato_imponibile as fatturatoImponibile,
          fatturato_previsionale as fatturatoPrevisionale,
          incassato,
          incassato_previsionale as incassatoPrevisionale,
          utile as utileCassa,
          utile_previsionale as utilePrevisionale,
          debiti_fornitore as debitiFornitore,
          debiti_bancari as debitiBancari
        FROM financial_stats 
        WHERE location_id = ?
        ORDER BY month DESC`,
        [locationId]
      );
    } catch (error) {
      console.error('Error fetching financial stats:', error);
      // Fallback: try with simpler query
      try {
        allStats = await dbQuery(
          locationId,
          `SELECT * FROM financial_stats WHERE location_id = ? ORDER BY month DESC`,
          [locationId]
        );
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        allStats = [];
      }
    }

    // 3. Get data entries (manual entries)
    let dataEntries = [];
    try {
      dataEntries = await dbQuery(
        locationId,
        `SELECT 
          macro, category, detail, year, month_index, value, type
        FROM data_entries 
        WHERE location_id = ?
        ORDER BY year DESC, month_index DESC`,
        [locationId]
      );
    } catch (error) {
      console.error('Error fetching data entries:', error);
      dataEntries = [];
    }

    // 4. Calculate current year stats
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Filter stats by year - handle different month formats (Gen. 24, Gennaio 2024, etc.)
    const currentYearStats = allStats.filter(s => {
      if (!s.month) return false;
      // Try format: "Gen. 24" or "Gen 24"
      const match1 = s.month.match(/(\w+)\.?\s*(\d{2})/);
      if (match1) {
        const year = parseInt('20' + match1[2]);
        return year === currentYear;
      }
      // Try format: "Gennaio 2024" or "January 2024"
      const match2 = s.month.match(/\d{4}/);
      if (match2) {
        return parseInt(match2[0]) === currentYear;
      }
      return false;
    });

    // Calculate YTD values
    let ytdFatturato = 0;
    let ytdIncassato = 0;
    let ytdUtile = 0;

    currentYearStats.forEach(stat => {
      // Handle both camelCase and snake_case column names
      ytdFatturato +=
        stat.fatturatoImponibile || stat.fatturato_imponibile || 0;
      ytdIncassato += stat.incassato || 0;
      ytdUtile += stat.utileCassa || stat.utile || 0;
    });

    // Get previous year for comparison
    const prevYear = currentYear - 1;
    const prevYearStats = allStats.filter(s => {
      if (!s.month) return false;
      // Try format: "Gen. 24" or "Gen 24"
      const match1 = s.month.match(/(\w+)\.?\s*(\d{2})/);
      if (match1) {
        const year = parseInt('20' + match1[2]);
        return year === prevYear;
      }
      // Try format: "Gennaio 2024" or "January 2024"
      const match2 = s.month.match(/\d{4}/);
      if (match2) {
        return parseInt(match2[0]) === prevYear;
      }
      return false;
    });

    let prevYtdFatturato = 0;
    let prevYtdIncassato = 0;
    let prevYtdUtile = 0;

    prevYearStats.slice(0, currentMonth + 1).forEach(stat => {
      // Handle both camelCase and snake_case column names
      prevYtdFatturato +=
        stat.fatturatoImponibile || stat.fatturato_imponibile || 0;
      prevYtdIncassato += stat.incassato || 0;
      prevYtdUtile += stat.utileCassa || stat.utile || 0;
    });

    // Calculate growth rates
    const fatturatoGrowth =
      prevYtdFatturato > 0
        ? (
            ((ytdFatturato - prevYtdFatturato) / prevYtdFatturato) *
            100
          ).toFixed(1)
        : null;
    const incassatoGrowth =
      prevYtdIncassato > 0
        ? (
            ((ytdIncassato - prevYtdIncassato) / prevYtdIncassato) *
            100
          ).toFixed(1)
        : null;
    const utileGrowth =
      prevYtdUtile !== 0
        ? (((ytdUtile - prevYtdUtile) / Math.abs(prevYtdUtile)) * 100).toFixed(
            1
          )
        : null;

    // Get last 3 months detailed
    const last3Months = allStats.slice(0, 3);

    // Calculate average monthly values (only if we have data)
    const monthsWithData = Math.max(1, currentYearStats.length); // Avoid division by zero
    const avgMonthlyFatturato =
      currentYearStats.length > 0
        ? (ytdFatturato / monthsWithData).toFixed(0)
        : '0';
    const avgMonthlyIncassato =
      currentYearStats.length > 0
        ? (ytdIncassato / monthsWithData).toFixed(0)
        : '0';

    // Build comprehensive financial context
    let financialContext = `\n\n===== DATI FINANZIARI REALI DAL DATABASE =====

ANNO CORRENTE: ${currentYear}
MESE CORRENTE: ${currentMonth + 1}

ANALISI YTD (Year-To-Date) ${currentYear}:
- Fatturato YTD: ${ytdFatturato.toLocaleString('it-IT')}€
- Incassato YTD: ${ytdIncassato.toLocaleString('it-IT')}€
- Utile YTD: ${ytdUtile.toLocaleString('it-IT')}€
- Media mensile fatturato: ${avgMonthlyFatturato}€
- Media mensile incassato: ${avgMonthlyIncassato}€

CONFRONTO CON ANNO PRECEDENTE (${prevYear}):
- Fatturato YTD ${prevYear}: ${prevYtdFatturato.toLocaleString('it-IT')}€
- Incassato YTD ${prevYear}: ${prevYtdIncassato.toLocaleString('it-IT')}€
- Utile YTD ${prevYear}: ${prevYtdUtile.toLocaleString('it-IT')}€

CRESCITE YTD:
- Fatturato: ${fatturatoGrowth ? fatturatoGrowth + '%' : 'N/A'}
- Incassato: ${incassatoGrowth ? incassatoGrowth + '%' : 'N/A'}
- Utile: ${utileGrowth ? utileGrowth + '%' : 'N/A'}

ULTIMI 3 MESI DETTAGLIATI:`;

    last3Months.forEach(stat => {
      financialContext += `\n\n${stat.month}:`;
      financialContext += `\n  - Fatturato: ${(stat.fatturatoImponibile || stat.fatturato_imponibile || 0).toLocaleString('it-IT')}€`;
      financialContext += `\n  - Incassato: ${(stat.incassato || 0).toLocaleString('it-IT')}€`;
      financialContext += `\n  - Utile: ${(stat.utileCassa || stat.utile || 0).toLocaleString('it-IT')}€`;
      // Note: saldo, crediti columns may not exist in all database schemas
      if (stat.debitiFornitore || stat.debiti_fornitore) {
        financialContext += `\n  - Debiti Fornitori: ${(stat.debitiFornitore || stat.debiti_fornitore || 0).toLocaleString('it-IT')}€`;
      }
      if (stat.debitiBancari || stat.debiti_bancari) {
        financialContext += `\n  - Debiti Bancari: ${(stat.debitiBancari || stat.debiti_bancari || 0).toLocaleString('it-IT')}€`;
      }
    });

    // Add data entries summary if available
    if (dataEntries && dataEntries.length > 0) {
      financialContext += `\n\nDATI MANUALI INSERITI: ${dataEntries.length} voci totali`;
      const entriesByType = {};
      dataEntries.forEach(entry => {
        if (!entriesByType[entry.type]) entriesByType[entry.type] = 0;
        const value =
          typeof entry.value === 'number'
            ? entry.value
            : parseFloat(entry.value) || 0;
        entriesByType[entry.type] += value;
      });
      financialContext += `\n- Preventivo: ${(entriesByType.preventivo || 0).toLocaleString('it-IT')}€`;
      financialContext += `\n- Consuntivo: ${(entriesByType.consuntivo || 0).toLocaleString('it-IT')}€`;
    }

    financialContext += `\n\nTOTALE MESI DISPONIBILI: ${allStats.length}`;
    financialContext += `\nANNI DISPONIBILI: ${availableYears.length > 0 ? availableYears.join(', ') : 'Nessun dato'}`;

    // ===== RECUPERO DATI MENU ENGINEERING DAL DATABASE =====
    let menuEngineeringContext = '';
    try {
      const db = getDatabase(locationId);

      // 1. Get raw materials
      const rawMaterials = await db.query(
        'SELECT * FROM raw_materials WHERE location_id = ? ORDER BY categoria, materia_prima',
        [locationId]
      );

      // 2. Get recipes with ingredients
      const recipes = await db.query(
        'SELECT * FROM recipes WHERE location_id = ? ORDER BY "order", nome_piatto',
        [locationId]
      );

      // Get ingredients for each recipe
      for (const recipe of recipes) {
        const ingredients = await db.query(
          'SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY created_at',
          [recipe.id]
        );
        recipe.ingredienti = ingredients;
      }

      // 3. Get recipe sales
      const recipeSales = await db.query(
        'SELECT * FROM recipe_sales WHERE location_id = ? ORDER BY sale_date DESC',
        [locationId]
      );

      // Build Menu Engineering context
      menuEngineeringContext = `\n\n===== DATI MENU ENGINEERING DAL DATABASE =====
      
MATERIE PRIME:
- Totale materie prime: ${rawMaterials.length}
${rawMaterials.length > 0 ? `- Tipologie uniche: ${Array.from(new Set(rawMaterials.map(m => m.tipologia))).length}` : ''}
${rawMaterials.length > 0 ? `- Categorie uniche: ${Array.from(new Set(rawMaterials.map(m => m.categoria))).length}` : ''}
${rawMaterials.length > 0 ? `- Fornitori unici: ${Array.from(new Set(rawMaterials.map(m => m.fornitore))).length}` : ''}
${rawMaterials.length > 0 ? `- Prezzo medio acquisto: ${(rawMaterials.reduce((sum, m) => sum + parseFloat(m.prezzo_acquisto || 0), 0) / rawMaterials.length).toFixed(2)}€` : ''}

RICETTE:
- Totale ricette: ${recipes.length}
${recipes.length > 0 ? `- Ricette per categoria:` : ''}
${
  recipes.length > 0
    ? Object.entries(
        recipes.reduce((acc, r) => {
          acc[r.categoria] = (acc[r.categoria] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([cat, count]) => `  - ${cat}: ${count}`)
        .join('\n')
    : ''
}
${recipes.length > 0 ? `- Prezzo medio vendita: ${(recipes.reduce((sum, r) => sum + parseFloat(r.prezzo_vendita || 0), 0) / recipes.length).toFixed(2)}€` : ''}
${recipes.length > 0 ? `- Food cost medio: ${(recipes.reduce((sum, r) => sum + parseFloat(r.food_cost || 0), 0) / recipes.length).toFixed(2)}€` : ''}
${recipes.length > 0 ? `- Marginalità media: ${(recipes.reduce((sum, r) => sum + parseFloat(r.marginalita || 0), 0) / recipes.length).toFixed(1)}%` : ''}
${recipes.length > 0 ? `- Utile medio per ricetta: ${(recipes.reduce((sum, r) => sum + parseFloat(r.utile || 0), 0) / recipes.length).toFixed(2)}€` : ''}

VENDITE RICETTE:
- Totale vendite registrate: ${recipeSales.length}
${recipeSales.length > 0 ? `- Quantità totale venduta: ${recipeSales.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0)}` : ''}
${recipeSales.length > 0 ? `- Ricette vendute (uniche): ${Array.from(new Set(recipeSales.map(s => s.recipe_id))).length}` : ''}`;

      // Add top recipes by sales
      if (recipeSales.length > 0) {
        const salesByRecipe = recipeSales.reduce((acc, sale) => {
          acc[sale.recipe_id] =
            (acc[sale.recipe_id] || 0) + parseFloat(sale.quantity || 0);
          return acc;
        }, {});

        const topRecipes = Object.entries(salesByRecipe)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([recipeId, quantity]) => {
            const recipe = recipes.find(r => r.id === recipeId);
            return recipe ? `${recipe.nome_piatto}: ${quantity} vendite` : null;
          })
          .filter(Boolean);

        if (topRecipes.length > 0) {
          menuEngineeringContext += `\n\nTOP 5 RICETTE PER VENDITE:\n${topRecipes.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
        }
      }

      // Add BCG Matrix analysis
      if (recipes.length > 0 && recipeSales.length > 0) {
        const avgPopularity =
          recipes.reduce((sum, r) => {
            const sales = recipeSales.filter(s => s.recipe_id === r.id);
            const totalQuantity = sales.reduce(
              (s, sale) => s + parseFloat(sale.quantity || 0),
              0
            );
            return sum + totalQuantity;
          }, 0) / recipes.length;

        const avgMargin =
          recipes.reduce((sum, r) => sum + parseFloat(r.marginalita || 0), 0) /
          recipes.length;

        const stars = recipes.filter(r => {
          const sales = recipeSales.filter(s => s.recipe_id === r.id);
          const popularity = sales.reduce(
            (s, sale) => s + parseFloat(sale.quantity || 0),
            0
          );
          return (
            popularity >= avgPopularity &&
            parseFloat(r.marginalita || 0) >= avgMargin
          );
        });

        const cashCows = recipes.filter(r => {
          const sales = recipeSales.filter(s => s.recipe_id === r.id);
          const popularity = sales.reduce(
            (s, sale) => s + parseFloat(sale.quantity || 0),
            0
          );
          return (
            popularity >= avgPopularity &&
            parseFloat(r.marginalita || 0) < avgMargin
          );
        });

        const questionMarks = recipes.filter(r => {
          const sales = recipeSales.filter(s => s.recipe_id === r.id);
          const popularity = sales.reduce(
            (s, sale) => s + parseFloat(sale.quantity || 0),
            0
          );
          return (
            popularity < avgPopularity &&
            parseFloat(r.marginalita || 0) >= avgMargin
          );
        });

        const dogs = recipes.filter(r => {
          const sales = recipeSales.filter(s => s.recipe_id === r.id);
          const popularity = sales.reduce(
            (s, sale) => s + parseFloat(sale.quantity || 0),
            0
          );
          return (
            popularity < avgPopularity &&
            parseFloat(r.marginalita || 0) < avgMargin
          );
        });

        menuEngineeringContext += `\n\nANALISI MATRICE BCG:
- Stelle (alta popolarità, alto margine): ${stars.length} ricette
- Mucche da Latte (alta popolarità, basso margine): ${cashCows.length} ricette
- Punti Interrogativi (bassa popolarità, alto margine): ${questionMarks.length} ricette
- Cani (bassa popolarità, basso margine): ${dogs.length} ricette`;
      }
    } catch (error) {
      console.error('Error fetching menu engineering data:', error);
      menuEngineeringContext =
        '\n\n===== DATI MENU ENGINEERING =====\nErrore nel recupero dei dati di Menu Engineering dal database.';
    }

    // System prompt - Expert in restaurant financial management AND menu engineering
    const systemPrompt = `Sei un ESPERTO DI GESTIONE FINANZIARIA AZIENDALE E MENU ENGINEERING SPECIALIZZATO IN RISTORAZIONE.

RUOLO E COMPETENZE:
- Sei un consulente finanziario esperto con anni di esperienza nella gestione finanziaria di ristoranti
- Sei anche un ESPERTO DI MENU ENGINEERING con competenze avanzate in analisi del menu, food cost, marginalità e ottimizzazione delle ricette
- Conosci perfettamente i KPI del settore ristorazione e le best practices
- Analizzi sempre i DATI CONCRETI dal database prima di rispondere
- Fornisci analisi approfondite, non risposte generiche
- Identifichi problemi, tendenze e opportunità basandoti sui dati reali

METODO DI LAVORO:
1. ANALIZZA SEMPRE I DATI REALI forniti nel contesto prima di rispondere
2. CALCOLA indicatori specifici usando i dati del database
3. CONFRONTA periodi diversi per identificare trend
4. IDENTIFICA anomalie, problemi o opportunità nei dati
5. FORNISCI raccomandazioni concrete e azionabili basate sui dati reali
6. MAI rispondere in modo generico - sempre con dati concreti e analisi specifiche

REGOLE AUREE PER I CALCOLI FINANZIARI (CRITICHE):
1. INCASSATO = sempre il valore aggregato della tipologia 1 (macroId: 1)
2. COSTI FISSI = sempre il valore aggregato della tipologia 2 (macroId: 2)
3. COSTI VARIABILI = sempre il valore aggregato della tipologia 3 (macroId: 3)
4. Utile = Tipologia1 - Tipologia2 - Tipologia3
5. NON usare mai nomi di causali specifiche nei calcoli, SEMPRE usare i totali aggregati delle tipologie
6. L'incidenza progressiva misura la percentuale del campo sul valore totale della tipologia INCASSATO

KPI SETTORE RISTORAZIONE (RIFERIMENTI):
- Incidenza costi fissi su incassato: 30-40% (buono), >45% (critico)
- Incidenza costi variabili su incassato: 25-35% (buono), >40% (critico)
- Incidenza utile su incassato: 15-25% (eccellente), 10-15% (buono), <10% (da migliorare)
- Margine operativo: >15% (eccellente), 10-15% (buono), <10% (critico)
- Giorni di credito clienti: <30 giorni (buono), >60 giorni (critico)
- Giorni di debito fornitori: 30-60 giorni (normale), >90 giorni (critico)

MENU ENGINEERING - CONOSCENZE E COMPETENZE:
1. STRUTTURA DATI:
   - MATERIE PRIME (raw_materials): ogni materia prima ha tipologia, categoria, codice, materia_prima, unita_misura (KG/LT/PZ), fornitore, prezzo_acquisto, data_ultimo_acquisto
   - RICETTE (recipes): ogni ricetta ha nome_piatto, categoria (antipasti/primi/secondi/dessert/altro), prezzo_vendita, ingredienti (array), food_cost (calcolato), utile (calcolato), marginalita (calcolata in %), order (per ordinamento)
   - INGREDIENTI RICETTE (recipe_ingredients): ogni ingrediente ha cod_materia, materia_prima, unita_misura, peso, costo (calcolato dal prezzo_acquisto della materia prima)
   - VENDITE RICETTE (recipe_sales): ogni vendita ha recipe_id, quantity, sale_date

2. CALCOLI MENU ENGINEERING:
   - FOOD COST = somma dei costi di tutti gli ingredienti di una ricetta
   - UTILE = prezzo_vendita - food_cost
   - MARGINALITÀ (%) = (utile / prezzo_vendita) * 100
   - POPOLARITÀ = quantità totale venduta di una ricetta (da recipe_sales)
   - TUTTI I DATI SONO SALVATI NEL DATABASE, MAI IN LOCALSTORAGE

3. MATRICE BCG (Boston Consulting Group):
   - STELLE: alta popolarità (>= media) E alto margine (>= media) → Mantieni e promuovi
   - MUCCHE DA LATTE: alta popolarità (>= media) MA basso margine (< media) → Ottimizza costi o aumenta prezzo
   - PUNTI INTERROGATIVI: bassa popolarità (< media) MA alto margine (>= media) → Strategie di marketing
   - CANI: bassa popolarità (< media) E basso margine (< media) → Valuta rimozione dal menu

4. KPI MENU ENGINEERING:
   - Food cost target: 25-35% del prezzo vendita (buono), <25% (eccellente), >35% (da migliorare)
   - Marginalità target: >30% (eccellente), 20-30% (buono), <20% (da migliorare)
   - Mix di vendita: analizza distribuzione vendite tra categorie (antipasti/primi/secondi/dessert)
   - Rotazione materie prime: monitora data_ultimo_acquisto per evitare scorte obsolete

5. GESTIONE MATERIE PRIME:
   - Tipologie, Categorie, Materie Prime e Fornitori sono gestiti tramite modali dedicati
   - Quando si modifica/elimina una tipologia/categoria/materia_prima/fornitore, tutte le materie prime che la utilizzano vengono aggiornate automaticamente
   - Le modifiche sono sempre salvate nel database, mai in localStorage

6. ANALISI DA FORNIRE:
   - Analisi food cost per ricetta e per categoria
   - Identificazione ricette con marginalità critica (<20%)
   - Analisi popolarità vs marginalità (matrice BCG)
   - Suggerimenti per ottimizzazione menu (rimuovere "cani", promuovere "stelle")
   - Analisi costi materie prime e confronto fornitori
   - Calcolo food cost totale del menu
   - Analisi mix di vendita e suggerimenti per bilanciamento menu

TIPI DI ANALISI DA FORNIRE:
1. ANALISI PERFORMANCE: confronta dati reali con benchmark di settore
2. ANALISI TREND: identifica tendenze nei dati (crescita, declino, stagionalità)
3. ANALISI COMPARATIVA: confronta periodi diversi (mese vs mese, anno vs anno)
4. ANALISI DIAGNOSTICA: identifica problemi specifici nei dati (es: utile negativo, crediti elevati)
5. ANALISI PROGNOSTICA: proietta tendenze future basandoti sui dati storici
6. RACCOMANDAZIONI: fornisci azioni concrete basate sui dati analizzati

FORMATO RISPOSTE:
- Inizia sempre con un'analisi concreta dei dati forniti
- Cita numeri specifici dal database
- Calcola indicatori quando necessario
- Identifica problemi o opportunità specifiche
- Fornisci raccomandazioni azionabili
- Usa un linguaggio professionale ma chiaro

RISPONDI SEMPRE IN ITALIANO. Sii un vero esperto che analizza dati concreti, non un assistente generico.
${financialContext}
${menuEngineeringContext}`;

    // Call OpenAI API
    const openaiKey = process.env.OPENAI_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Use native fetch (available in Node.js 18+)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.3, // Lower temperature for more focused, data-driven responses
        max_tokens: 2000, // Increased for detailed analysis
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return res.status(500).json({
        error: 'Failed to get response from AI',
        details: process.env.NODE_ENV === 'development' ? errorData : undefined,
      });
    }

    const data = await response.json();
    const aiResponse =
      data.choices[0]?.message?.content ||
      'Mi dispiace, non sono riuscito a generare una risposta.';

    res.json({
      success: true,
      response: aiResponse,
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      error: 'Failed to process chatbot request',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ============================================
// MENU ENGINEERING API ENDPOINTS
// ============================================

// Dropdown Values API (for tipologie, categorie, materie prime, fornitori)
app.get(
  '/api/menu-engineering/dropdown-values',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.query.locationId;
      const type = req.query.type; // tipologia, categoria, materia_prima, fornitore

      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      if (!type) {
        return res.status(400).json({ error: 'Type is required' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const db = getDatabase(locationId);
      try {
        const values = await db.query(
          'SELECT value FROM menu_dropdown_values WHERE location_id = ? AND type = ? ORDER BY value',
          [locationId, type]
        );

        res.json(values.map(v => v.value));
      } catch (error) {
        // If table doesn't exist yet, return empty array
        const errorMessage = error?.message || String(error) || '';
        const errorString = errorMessage.toLowerCase();

        if (
          errorString.includes('does not exist') ||
          errorString.includes('could not find') ||
          errorString.includes('relation') ||
          errorString.includes('table') ||
          errorString.includes('no such table') ||
          errorString.includes('undefined table')
        ) {
          console.log(
            `Table menu_dropdown_values doesn't exist yet for type ${type}, returning empty array`
          );
          return res.json([]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      // Check again in outer catch for table not found errors
      const errorMessage = error?.message || String(error) || '';
      const errorString = errorMessage.toLowerCase();

      // Check if error is from Supabase wrapper indicating table doesn't exist
      if (
        error?.table === 'menu_dropdown_values' ||
        errorString.includes('does not exist') ||
        errorString.includes('could not find') ||
        errorString.includes('relation') ||
        errorString.includes('table') ||
        errorString.includes('no such table') ||
        errorString.includes('undefined table') ||
        errorString.includes('menu_dropdown_values')
      ) {
        console.log(
          `Table menu_dropdown_values doesn't exist yet, returning empty array`
        );
        return res.json([]);
      }

      console.error('Failed to get dropdown values:', error);
      res.status(500).json({ error: 'Failed to get dropdown values' });
    }
  }
);

app.post(
  '/api/menu-engineering/dropdown-values',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.body.locationId;
      const { type, values } = req.body; // type: tipologia, categoria, materia_prima, fornitore

      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      if (!type || !Array.isArray(values)) {
        return res
          .status(400)
          .json({ error: 'Type and values array are required' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const db = getDatabase(locationId);

      try {
        // Delete existing values for this type
        await db.run(
          'DELETE FROM menu_dropdown_values WHERE location_id = ? AND type = ?',
          [locationId, type]
        );

        // Insert new values
        for (const value of values) {
          if (value && value.trim()) {
            const id = crypto.randomUUID();
            await db.run(
              'INSERT INTO menu_dropdown_values (id, location_id, type, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
              [
                id,
                locationId,
                type,
                value.trim(),
                new Date().toISOString(),
                new Date().toISOString(),
              ]
            );
          }
        }

        res.json({ success: true });
      } catch (error) {
        // If table doesn't exist, inform user they need to create it
        const errorMessage = error?.message || String(error) || '';
        const errorString = errorMessage.toLowerCase();

        if (
          error?.table === 'menu_dropdown_values' ||
          errorString.includes('does not exist') ||
          errorString.includes('could not find') ||
          errorString.includes('relation') ||
          errorString.includes('table') ||
          errorString.includes('no such table') ||
          errorString.includes('undefined table') ||
          errorString.includes('menu_dropdown_values')
        ) {
          console.error(
            `Table menu_dropdown_values doesn't exist. Please create it in Supabase with columns: id (uuid, primary key), location_id (text), type (text), value (text), created_at (timestamp), updated_at (timestamp)`
          );
          res.status(400).json({
            error:
              'Table menu_dropdown_values does not exist. Please create it in Supabase.',
          });
          return;
        }

        throw error;
      }
    } catch (error) {
      console.error('Failed to save dropdown values:', error);
      res.status(500).json({ error: 'Failed to save dropdown values' });
    }
  }
);

// Raw Materials API
app.get(
  '/api/menu-engineering/raw-materials',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.query.locationId;
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      // If locationId is "all", aggregate raw materials from all active locations
      if (locationId === 'all') {
        const locations = await masterDbQuery(
          'SELECT id FROM locations WHERE status = ? AND id != ?',
          ['active', 'all']
        );
        const allMaterials = [];

        for (const location of locations) {
          try {
            const db = getDatabase(location.id);
            const materials = await db.query(
              'SELECT * FROM raw_materials WHERE location_id = ? ORDER BY categoria, materia_prima',
              [location.id]
            );
            allMaterials.push(...materials);
          } catch (error) {
            console.error(
              `Failed to get materials for location ${location.id}:`,
              error
            );
          }
        }

        res.json(allMaterials);
      } else {
        const db = getDatabase(locationId);
        const materials = await db.query(
          'SELECT * FROM raw_materials WHERE location_id = ? ORDER BY categoria, materia_prima',
          [locationId]
        );

        res.json(materials);
      }
    } catch (error) {
      console.error('Failed to get raw materials', error);
      res.status(500).json({ error: 'Failed to get raw materials' });
    }
  }
);

app.post(
  '/api/menu-engineering/raw-materials',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.body.locationId;
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      // Prevent modifications when "all" is selected
      if (locationId === 'all') {
        return res
          .status(403)
          .json({ error: 'Cannot modify data when viewing all locations' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const {
        tipologia,
        categoria,
        codice,
        materiaPrima,
        unitaMisura,
        fornitore,
        prezzoAcquisto,
        dataUltimoAcquisto,
      } = req.body;

      if (
        !tipologia ||
        !categoria ||
        !codice ||
        !materiaPrima ||
        !unitaMisura ||
        !fornitore ||
        prezzoAcquisto === undefined ||
        !dataUltimoAcquisto
      ) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const id = crypto.randomUUID();
      const db = getDatabase(locationId);
      await db.run(
        'INSERT INTO raw_materials (id, location_id, tipologia, categoria, codice, materia_prima, unita_misura, fornitore, prezzo_acquisto, data_ultimo_acquisto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          locationId,
          tipologia,
          categoria,
          codice,
          materiaPrima,
          unitaMisura,
          fornitore,
          prezzoAcquisto,
          new Date(dataUltimoAcquisto).toISOString(),
        ]
      );

      const material = await db.get(
        'SELECT * FROM raw_materials WHERE id = ?',
        [id]
      );
      res.status(201).json(material);
    } catch (error) {
      console.error('Failed to create raw material', error);
      res.status(500).json({ error: 'Failed to create raw material' });
    }
  }
);

app.put(
  '/api/menu-engineering/raw-materials/:id',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.body.locationId;
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      // Prevent modifications when "all" is selected
      if (locationId === 'all') {
        return res
          .status(403)
          .json({ error: 'Cannot modify data when viewing all locations' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const { id } = req.params;
      const {
        tipologia,
        categoria,
        codice,
        materiaPrima,
        unitaMisura,
        fornitore,
        prezzoAcquisto,
        dataUltimoAcquisto,
      } = req.body;

      const db = getDatabase(locationId);
      await db.run(
        'UPDATE raw_materials SET tipologia = ?, categoria = ?, codice = ?, materia_prima = ?, unita_misura = ?, fornitore = ?, prezzo_acquisto = ?, data_ultimo_acquisto = ?, updated_at = ? WHERE id = ? AND location_id = ?',
        [
          tipologia,
          categoria,
          codice,
          materiaPrima,
          unitaMisura,
          fornitore,
          prezzoAcquisto,
          new Date(dataUltimoAcquisto).toISOString(),
          new Date().toISOString(),
          id,
          locationId,
        ]
      );

      const material = await db.get(
        'SELECT * FROM raw_materials WHERE id = ?',
        [id]
      );
      res.json(material);
    } catch (error) {
      console.error('Failed to update raw material', error);
      res.status(500).json({ error: 'Failed to update raw material' });
    }
  }
);

app.delete(
  '/api/menu-engineering/raw-materials/:id',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.query.locationId;
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      // Prevent modifications when "all" is selected
      if (locationId === 'all') {
        return res
          .status(403)
          .json({ error: 'Cannot modify data when viewing all locations' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const { id } = req.params;
      const db = getDatabase(locationId);
      await db.run(
        'DELETE FROM raw_materials WHERE id = ? AND location_id = ?',
        [id, locationId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete raw material', error);
      res.status(500).json({ error: 'Failed to delete raw material' });
    }
  }
);

// Recipes API
app.get('/api/menu-engineering/recipes', requireAuth, async (req, res) => {
  try {
    const locationId = req.headers['x-location-id'] || req.query.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDb.get(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );
      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    // If locationId is "all", aggregate recipes from all active locations
    if (locationId === 'all') {
      const locations = await masterDbQuery(
        'SELECT id FROM locations WHERE status = ? AND id != ?',
        ['active', 'all']
      );
      const allRecipes = [];

      for (const location of locations) {
        try {
          const db = getDatabase(location.id);
          const recipes = await db.query(
            'SELECT * FROM recipes WHERE location_id = ? ORDER BY "order", nome_piatto',
            [location.id]
          );

          // Get ingredients for each recipe
          for (const recipe of recipes) {
            const ingredients = await db.query(
              'SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY created_at',
              [recipe.id]
            );
            recipe.ingredienti = ingredients;
          }

          allRecipes.push(...recipes);
        } catch (error) {
          console.error(
            `Failed to get recipes for location ${location.id}:`,
            error
          );
        }
      }

      res.json(allRecipes);
    } else {
      const db = getDatabase(locationId);
      const recipes = await db.query(
        'SELECT * FROM recipes WHERE location_id = ? ORDER BY "order", nome_piatto',
        [locationId]
      );

      // Get ingredients for each recipe
      for (const recipe of recipes) {
        const ingredients = await db.query(
          'SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY created_at',
          [recipe.id]
        );
        recipe.ingredienti = ingredients;
      }

      res.json(recipes);
    }
  } catch (error) {
    console.error('Failed to get recipes', error);
    res.status(500).json({ error: 'Failed to get recipes' });
  }
});

app.post('/api/menu-engineering/recipes', requireAuth, async (req, res) => {
  try {
    const locationId = req.headers['x-location-id'] || req.body.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Prevent modifications when "all" is selected
    if (locationId === 'all') {
      return res
        .status(403)
        .json({ error: 'Cannot modify data when viewing all locations' });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDb.get(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );
      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    const { nomePiatto, categoria, prezzoVendita, ingredienti, order } =
      req.body;

    if (
      !nomePiatto ||
      !categoria ||
      !prezzoVendita ||
      !ingredienti ||
      !Array.isArray(ingredienti)
    ) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Calculate food cost, profit, and margin
    const foodCost = ingredienti.reduce(
      (sum, ing) => sum + (parseFloat(ing.costo) || 0),
      0
    );
    const utile = parseFloat(prezzoVendita) - foodCost;
    // Limit marginalita to -999.99 to 999.99 to prevent numeric overflow
    let marginalita = prezzoVendita > 0 ? (utile / prezzoVendita) * 100 : 0;
    marginalita = Math.max(-999.99, Math.min(999.99, marginalita));

    const id = crypto.randomUUID();
    const db = getDatabase(locationId);
    await db.run(
      'INSERT INTO recipes (id, location_id, nome_piatto, categoria, prezzo_vendita, food_cost, utile, marginalita, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        locationId,
        nomePiatto,
        categoria,
        prezzoVendita,
        foodCost,
        utile,
        marginalita,
        order || 0,
      ]
    );

    // Insert ingredients
    for (const ing of ingredienti) {
      // Validate ingredient data
      if (
        !ing.codMateria ||
        !ing.materiaPrima ||
        !ing.unitaMisura ||
        ing.peso === undefined ||
        ing.costo === undefined
      ) {
        throw new Error(
          `Invalid ingredient data: ${JSON.stringify(ing)}. All fields are required.`
        );
      }

      const ingId = crypto.randomUUID();
      await db.run(
        'INSERT INTO recipe_ingredients (id, recipe_id, cod_materia, materia_prima, unita_misura, peso, costo) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          ingId,
          id,
          ing.codMateria || '',
          ing.materiaPrima || '',
          ing.unitaMisura || 'KG',
          parseFloat(ing.peso) || 0,
          parseFloat(ing.costo) || 0,
        ]
      );
    }

    const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [id]);
    const ingredients = await db.query(
      'SELECT * FROM recipe_ingredients WHERE recipe_id = ?',
      [id]
    );
    recipe.ingredienti = ingredients;

    res.status(201).json(recipe);
  } catch (error) {
    console.error('Failed to create recipe', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    res.status(500).json({
      error: 'Failed to create recipe',
      details: error.message,
    });
  }
});

app.put('/api/menu-engineering/recipes/:id', requireAuth, async (req, res) => {
  try {
    const locationId = req.headers['x-location-id'] || req.body.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Prevent modifications when "all" is selected
    if (locationId === 'all') {
      return res
        .status(403)
        .json({ error: 'Cannot modify data when viewing all locations' });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDb.get(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );
      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    const { id } = req.params;
    const { nomePiatto, categoria, prezzoVendita, ingredienti, order } =
      req.body;

    const db = getDatabase(locationId);

    // If ingredients are provided, recalculate food cost
    if (ingredienti && Array.isArray(ingredienti)) {
      const foodCost = ingredienti.reduce(
        (sum, ing) => sum + (parseFloat(ing.costo) || 0),
        0
      );
      const utile = parseFloat(prezzoVendita || 0) - foodCost;
      // Limit marginalita to -999.99 to 999.99 to prevent numeric overflow
      let marginalita = prezzoVendita > 0 ? (utile / prezzoVendita) * 100 : 0;
      marginalita = Math.max(-999.99, Math.min(999.99, marginalita));

      // Update recipe
      await db.run(
        'UPDATE recipes SET nome_piatto = ?, categoria = ?, prezzo_vendita = ?, food_cost = ?, utile = ?, marginalita = ?, "order" = ?, updated_at = ? WHERE id = ? AND location_id = ?',
        [
          nomePiatto,
          categoria,
          prezzoVendita,
          foodCost,
          utile,
          marginalita,
          order,
          new Date().toISOString(),
          id,
          locationId,
        ]
      );

      // Delete old ingredients
      await db.run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);

      // Insert new ingredients
      for (const ing of ingredienti) {
        // Validate ingredient data
        if (
          !ing.codMateria ||
          !ing.materiaPrima ||
          !ing.unitaMisura ||
          ing.peso === undefined ||
          ing.costo === undefined
        ) {
          throw new Error(
            `Invalid ingredient data: ${JSON.stringify(ing)}. All fields are required.`
          );
        }

        const ingId = crypto.randomUUID();
        await db.run(
          'INSERT INTO recipe_ingredients (id, recipe_id, cod_materia, materia_prima, unita_misura, peso, costo) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            ingId,
            id,
            ing.codMateria || '',
            ing.materiaPrima || '',
            ing.unitaMisura || 'KG',
            parseFloat(ing.peso) || 0,
            parseFloat(ing.costo) || 0,
          ]
        );
      }
    } else {
      // Update only recipe fields
      await db.run(
        'UPDATE recipes SET nome_piatto = ?, categoria = ?, prezzo_vendita = ?, "order" = ?, updated_at = ? WHERE id = ? AND location_id = ?',
        [
          nomePiatto,
          categoria,
          prezzoVendita,
          order,
          new Date().toISOString(),
          id,
          locationId,
        ]
      );
    }

    const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [id]);
    const ingredients = await db.query(
      'SELECT * FROM recipe_ingredients WHERE recipe_id = ?',
      [id]
    );
    recipe.ingredienti = ingredients;

    res.json(recipe);
  } catch (error) {
    console.error('Failed to update recipe', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params,
    });
    res.status(500).json({
      error: 'Failed to update recipe',
      details: error.message,
    });
  }
});

app.delete(
  '/api/menu-engineering/recipes/:id',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.query.locationId;
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      // Prevent modifications when "all" is selected
      if (locationId === 'all') {
        return res
          .status(403)
          .json({ error: 'Cannot modify data when viewing all locations' });
      }

      const { id } = req.params;
      const db = getDatabase(locationId);
      // Ingredients will be deleted automatically due to CASCADE
      await db.run('DELETE FROM recipes WHERE id = ? AND location_id = ?', [
        id,
        locationId,
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete recipe', error);
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  }
);

// Recipe Sales API (for BCG matrix)
app.get('/api/menu-engineering/recipe-sales', requireAuth, async (req, res) => {
  try {
    const locationId = req.headers['x-location-id'] || req.query.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const hasPermission = await masterDb.get(
        'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
        [req.user.id, locationId]
      );
      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Access denied to this location' });
      }
    }

    // If locationId is "all", aggregate recipe sales from all active locations
    if (locationId === 'all') {
      const locations = await masterDbQuery(
        'SELECT id FROM locations WHERE status = ? AND id != ?',
        ['active', 'all']
      );
      const allSales = [];

      for (const location of locations) {
        try {
          const db = getDatabase(location.id);
          const sales = await db.query(
            'SELECT * FROM recipe_sales WHERE location_id = ? ORDER BY sale_date DESC',
            [location.id]
          );
          allSales.push(...sales);
        } catch (error) {
          console.error(
            `Failed to get recipe sales for location ${location.id}:`,
            error
          );
        }
      }

      res.json(allSales);
    } else {
      const db = getDatabase(locationId);
      const sales = await db.query(
        'SELECT * FROM recipe_sales WHERE location_id = ? ORDER BY sale_date DESC',
        [locationId]
      );

      res.json(sales);
    }
  } catch (error) {
    console.error('Failed to get recipe sales', error);
    res.status(500).json({ error: 'Failed to get recipe sales' });
  }
});

app.post(
  '/api/menu-engineering/recipe-sales',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.body.locationId;
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const { recipeId, quantity, saleDate } = req.body;

      if (!recipeId || quantity === undefined || !saleDate) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const id = crypto.randomUUID();
      const db = getDatabase(locationId);
      await db.run(
        'INSERT INTO recipe_sales (id, location_id, recipe_id, quantity, sale_date) VALUES (?, ?, ?, ?, ?)',
        [id, locationId, recipeId, quantity, saleDate]
      );

      const sale = await db.get('SELECT * FROM recipe_sales WHERE id = ?', [
        id,
      ]);
      res.status(201).json(sale);
    } catch (error) {
      console.error('Failed to create recipe sale', error);
      res.status(500).json({ error: 'Failed to create recipe sale' });
    }
  }
);

// =====================================================
// SALES ANALYSIS API ENDPOINTS
// =====================================================

// Helper function to calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

function calculateSimilarity(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

// Upload and preview Excel file
app.post(
  '/api/sales-analysis/upload-preview',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File non fornito' });
      }

      const locationId = req.headers['x-location-id'] || req.body.locationId;
      if (!locationId || locationId === 'all') {
        return res.status(400).json({ error: 'Location ID valido richiesto' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const parseResult = parseExcelFile(
        req.file.buffer,
        req.file.originalname
      );
      const validation = validateParsedData(parseResult);

      res.json({
        preview: {
          fileName: parseResult.metadata.fileName,
          fileSize: parseResult.metadata.fileSize,
          sheets: parseResult.metadata.sheetNames.map(name => ({
            name,
            rowCount: 0, // Would need to calculate from sheet
          })),
          summaryTable: {
            rows: parseResult.summaryTable.slice(0, 10),
            totalRows: parseResult.summaryTable.length,
          },
          detailTable: {
            rows: parseResult.detailTable.slice(0, 20),
            totalRows: parseResult.detailTable.length,
            sampleRows: parseResult.detailTable.slice(0, 20),
          },
        },
        validation,
      });
    } catch (error) {
      console.error('Failed to parse Excel file:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to parse Excel file' });
    }
  }
);

// Import sales data
app.post(
  '/api/sales-analysis/import',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File non fornito' });
      }

      const locationId = req.headers['x-location-id'] || req.body.locationId;
      const { periodMonth, periodYear, overwriteExisting } = req.body;

      if (!locationId || locationId === 'all') {
        return res.status(400).json({ error: 'Location ID valido richiesto' });
      }

      if (!periodMonth || !periodYear) {
        return res.status(400).json({ error: 'Mese e anno periodo richiesti' });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasPermission = await masterDb.get(
          'SELECT id FROM user_location_permissions WHERE user_id = ? AND location_id = ?',
          [req.user.id, locationId]
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ error: 'Access denied to this location' });
        }
      }

      const db = getLocationDb(locationId);

      // Check if import already exists
      const existingImport = await db.get(
        'SELECT * FROM sales_imports WHERE location_id = ? AND period_month = ? AND period_year = ?',
        [locationId, periodMonth, periodYear]
      );

      if (existingImport && !overwriteExisting) {
        return res.status(409).json({
          error: 'Import già esistente per questo periodo',
          existingImport,
        });
      }

      // Parse Excel file
      const parseResult = parseExcelFile(
        req.file.buffer,
        req.file.originalname
      );
      const validation = validateParsedData(parseResult);

      if (!validation.isValid) {
        return res.status(400).json({
          error: 'File contiene errori',
          validation,
        });
      }

      // Delete existing import if overwriting
      if (existingImport && overwriteExisting) {
        await db.run('DELETE FROM sales_imports WHERE id = ?', [
          existingImport.id,
        ]);
      }

      // Create import record
      const importId = crypto.randomUUID();
      await db.run(
        `INSERT INTO sales_imports (
          id, location_id, period_month, period_year, file_name, file_size_bytes, 
          file_hash, total_categories, total_dishes, total_quantity, total_value,
          status, imported_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          importId,
          locationId,
          periodMonth,
          periodYear,
          parseResult.metadata.fileName,
          parseResult.metadata.fileSize,
          parseResult.fileHash,
          parseResult.summaryTable.length,
          parseResult.detailTable.length,
          parseResult.detailTable.reduce((sum, d) => sum + d.quantity, 0),
          parseResult.detailTable.reduce((sum, d) => sum + d.totalValue, 0),
          'processing',
          req.user.id,
        ]
      );

      // Get all recipes for matching
      const recipes = await db.query(
        'SELECT * FROM recipes WHERE location_id = ?',
        [locationId]
      );

      // Get existing dishes
      const existingDishes = await db.query(
        'SELECT * FROM sales_dishes WHERE location_id = ?',
        [locationId]
      );
      const dishesMap = new Map();
      existingDishes.forEach(d => {
        dishesMap.set(d.dish_name, d);
      });

      const matches = [];
      let dishesNew = 0;
      let dishesExisting = 0;
      let dishesMatched = 0;
      let dishesUnmatched = 0;

      // Process categories
      for (const category of parseResult.summaryTable) {
        await db.run(
          `INSERT INTO sales_categories (
            id, location_id, import_id, category_name, category_name_normalized,
            quantity, total_value
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            locationId,
            importId,
            category.category,
            normalizeCategoryName(category.category),
            category.quantity,
            category.totalValue,
          ]
        );
      }

      // Process dishes
      for (const dishData of parseResult.detailTable) {
        const normalizedName = normalizeDishName(dishData.dishName);
        let dish = dishesMap.get(normalizedName);
        let matchResult = null;

        if (!dish) {
          // New dish
          dishesNew++;
          const dishId = crypto.randomUUID();
          dish = {
            id: dishId,
            location_id: locationId,
            dish_name: normalizedName,
            dish_name_original: dishData.dishName,
            category_gestionale: dishData.category,
            recipe_id: null,
            is_linked: false,
          };

          // Try to match with recipes
          let bestMatch = null;
          let bestConfidence = 0;

          for (const recipe of recipes) {
            const recipeNormalized = normalizeDishName(recipe.nome_piatto);

            // Exact match
            if (normalizedName === recipeNormalized) {
              bestMatch = recipe;
              bestConfidence = 1.0;
              matchResult = {
                method: 'exact',
                reasons: ['Nome identico dopo normalizzazione'],
              };
              break;
            }

            // Fuzzy match
            const similarity = calculateSimilarity(
              normalizedName,
              recipeNormalized
            );
            if (similarity > bestConfidence && similarity > 0.8) {
              bestMatch = recipe;
              bestConfidence = similarity;
              matchResult = {
                method: 'fuzzy',
                reasons: [`Similarità ${(similarity * 100).toFixed(0)}%`],
              };
            }
          }

          if (bestMatch) {
            dish.recipe_id = bestMatch.id;
            dish.is_linked = true;
            dishesMatched++;
            matches.push({
              dishId: dishId,
              dishName: dishData.dishName,
              recipeId: bestMatch.id,
              recipeName: bestMatch.nome_piatto,
              confidence: bestConfidence,
              method: matchResult.method,
              reasons: matchResult.reasons,
            });
          } else {
            dishesUnmatched++;
            matches.push({
              dishId: dishId,
              dishName: dishData.dishName,
              recipeId: null,
              recipeName: null,
              confidence: 0,
              method: null,
              reasons: ['Nessun match trovato'],
            });
          }

          await db.run(
            `INSERT INTO sales_dishes (
              id, location_id, dish_name, dish_name_original, category_gestionale,
              recipe_id, is_linked, match_confidence, match_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              dish.id,
              dish.location_id,
              dish.dish_name,
              dish.dish_name_original,
              dish.category_gestionale,
              dish.recipe_id,
              dish.is_linked,
              bestConfidence > 0 ? bestConfidence : null,
              matchResult?.method || null,
            ]
          );

          dishesMap.set(normalizedName, dish);
        } else {
          // Existing dish
          dishesExisting++;
          if (dish.recipe_id) {
            dishesMatched++;
          } else {
            dishesUnmatched++;
          }
        }

        // Create sales_dish_data record
        await db.run(
          `INSERT INTO sales_dish_data (
            id, location_id, import_id, dish_id, recipe_id,
            quantity, total_value, period_month, period_year
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            locationId,
            importId,
            dish.id,
            dish.recipe_id,
            dishData.quantity,
            dishData.totalValue,
            periodMonth,
            periodYear,
          ]
        );

        // If dish is linked, create recipe_sales record
        if (dish.recipe_id) {
          const saleDate = new Date(periodYear, periodMonth - 1, 1)
            .toISOString()
            .split('T')[0];
          try {
            await db.run(
              `INSERT INTO recipe_sales (id, location_id, recipe_id, quantity, sale_date)
               VALUES (?, ?, ?, ?, ?)`,
              [
                crypto.randomUUID(),
                locationId,
                dish.recipe_id,
                dishData.quantity,
                saleDate,
              ]
            );
          } catch (err) {
            // Ignore duplicate key errors
            if (!err.message.includes('UNIQUE constraint')) {
              console.error('Failed to create recipe_sales:', err);
            }
          }
        }
      }

      // Update import status
      await db.run(
        'UPDATE sales_imports SET status = ?, updated_at = NOW() WHERE id = ?',
        ['completed', importId]
      );

      res.json({
        success: true,
        importId,
        stats: {
          categoriesImported: parseResult.summaryTable.length,
          dishesImported: parseResult.detailTable.length,
          dishesNew,
          dishesExisting,
          dishesMatched,
          dishesUnmatched,
          totalQuantity: parseResult.detailTable.reduce(
            (sum, d) => sum + d.quantity,
            0
          ),
          totalValue: parseResult.detailTable.reduce(
            (sum, d) => sum + d.totalValue,
            0
          ),
        },
        matches,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    } catch (error) {
      console.error('Failed to import sales data:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to import sales data' });
    }
  }
);

// Get imports list
app.get('/api/sales-analysis/imports', requireAuth, async (req, res) => {
  try {
    const locationId = req.headers['x-location-id'] || req.query.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    const db = getLocationDb(locationId);
    const imports = await db.query(
      'SELECT * FROM sales_imports WHERE location_id = ? ORDER BY period_year DESC, period_month DESC LIMIT 50',
      [locationId]
    );

    res.json({ imports, total: imports.length });
  } catch (error) {
    console.error('Failed to get imports:', error);
    res.status(500).json({ error: 'Failed to get imports' });
  }
});

// Get dishes list
app.get('/api/sales-analysis/dishes', requireAuth, async (req, res) => {
  try {
    const locationId = req.headers['x-location-id'] || req.query.locationId;
    const { linked, category, search, limit = 100, offset = 0 } = req.query;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    const db = getLocationDb(locationId);

    // Get all dishes first, then filter in JavaScript since Supabase wrapper doesn't support complex ILIKE with OR
    let dishes = await db.query(
      'SELECT * FROM sales_dishes WHERE location_id = ?',
      [locationId]
    );

    // Apply filters in JavaScript
    if (linked === 'true') {
      dishes = dishes.filter(d => d.is_linked === true);
    } else if (linked === 'false') {
      dishes = dishes.filter(d => d.is_linked === false);
    }

    if (category) {
      dishes = dishes.filter(d => d.category_gestionale === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      dishes = dishes.filter(
        d =>
          (d.dish_name && d.dish_name.toLowerCase().includes(searchLower)) ||
          (d.dish_name_original &&
            d.dish_name_original.toLowerCase().includes(searchLower))
      );
    }

    // Sort by last_seen_date DESC
    dishes.sort((a, b) => {
      const dateA = new Date(a.last_seen_date || 0).getTime();
      const dateB = new Date(b.last_seen_date || 0).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const total = dishes.length;
    const paginatedDishes = dishes.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      dishes: paginatedDishes,
      total,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total,
      },
    });
  } catch (error) {
    console.error('Failed to get dishes:', error);
    res.status(500).json({
      error: 'Failed to get dishes: ' + (error.message || 'Unknown error'),
    });
  }
});

// Link dish to recipe
app.put(
  '/api/sales-analysis/dishes/:dishId/link',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.body.locationId;
      const { dishId } = req.params;
      const { recipeId } = req.body;

      if (!locationId || locationId === 'all') {
        return res.status(400).json({ error: 'Location ID valido richiesto' });
      }

      const db = getLocationDb(locationId);

      // Update dish
      await db.run(
        'UPDATE sales_dishes SET recipe_id = ?, is_linked = ?, match_method = ?, updated_at = NOW() WHERE id = ? AND location_id = ?',
        [
          recipeId || null,
          !!recipeId,
          recipeId ? 'manual' : null,
          dishId,
          locationId,
        ]
      );

      // Get updated dish
      const dish = await db.get('SELECT * FROM sales_dishes WHERE id = ?', [
        dishId,
      ]);

      // If linked, create recipe_sales records for all historical data
      if (recipeId) {
        const dishData = await db.query(
          'SELECT * FROM sales_dish_data WHERE dish_id = ?',
          [dishId]
        );

        for (const data of dishData) {
          const saleDate = new Date(data.period_year, data.period_month - 1, 1)
            .toISOString()
            .split('T')[0];
          try {
            await db.run(
              `INSERT INTO recipe_sales (id, location_id, recipe_id, quantity, sale_date)
             VALUES (?, ?, ?, ?, ?)`,
              [
                crypto.randomUUID(),
                locationId,
                recipeId,
                data.quantity,
                saleDate,
              ]
            );
          } catch (err) {
            // Ignore duplicates
            if (!err.message.includes('UNIQUE constraint')) {
              console.error('Failed to create recipe_sales:', err);
            }
          }
        }

        // Update sales_dish_data with recipe_id
        await db.run(
          'UPDATE sales_dish_data SET recipe_id = ? WHERE dish_id = ?',
          [recipeId, dishId]
        );
      }

      res.json({ success: true, dish });
    } catch (error) {
      console.error('Failed to link dish:', error);
      res.status(500).json({ error: 'Failed to link dish' });
    }
  }
);

// Batch link dishes
app.post(
  '/api/sales-analysis/dishes/batch-link',
  requireAuth,
  async (req, res) => {
    try {
      const locationId = req.headers['x-location-id'] || req.body.locationId;
      const { links } = req.body;

      if (!locationId || locationId === 'all') {
        return res.status(400).json({ error: 'Location ID valido richiesto' });
      }

      if (!Array.isArray(links)) {
        return res.status(400).json({ error: 'Links deve essere un array' });
      }

      const db = getLocationDb(locationId);
      let linked = 0;
      const errors = [];

      for (const link of links) {
        try {
          await db.run(
            'UPDATE sales_dishes SET recipe_id = ?, is_linked = ?, match_method = ?, updated_at = NOW() WHERE id = ? AND location_id = ?',
            [
              link.recipeId || null,
              !!link.recipeId,
              link.recipeId ? 'manual' : null,
              link.dishId,
              locationId,
            ]
          );

          if (link.recipeId) {
            // Create recipe_sales records
            const dishData = await db.query(
              'SELECT * FROM sales_dish_data WHERE dish_id = ?',
              [link.dishId]
            );

            for (const data of dishData) {
              const saleDate = new Date(
                data.period_year,
                data.period_month - 1,
                1
              )
                .toISOString()
                .split('T')[0];
              try {
                await db.run(
                  `INSERT INTO recipe_sales (id, location_id, recipe_id, quantity, sale_date)
                 VALUES (?, ?, ?, ?, ?)`,
                  [
                    crypto.randomUUID(),
                    locationId,
                    link.recipeId,
                    data.quantity,
                    saleDate,
                  ]
                );
              } catch (err) {
                // Ignore duplicates
              }
            }

            await db.run(
              'UPDATE sales_dish_data SET recipe_id = ? WHERE dish_id = ?',
              [link.recipeId, link.dishId]
            );
          }

          linked++;
        } catch (error) {
          errors.push({
            dishId: link.dishId,
            error: error.message,
          });
        }
      }

      res.json({ success: true, linked, errors });
    } catch (error) {
      console.error('Failed to batch link:', error);
      res.status(500).json({ error: 'Failed to batch link' });
    }
  }
);

// Get dashboard data
app.get('/api/sales-analysis/dashboard', requireAuth, async (req, res) => {
  try {
    const locationId = req.headers['x-location-id'] || req.query.locationId;
    const {
      granularity = 'anno',
      periodMonth,
      periodYear,
      category,
      recipeId,
      compareWithPrevious = 'false',
    } = req.query;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    const db = getLocationDb(locationId);
    const currentYear = parseInt(periodYear) || new Date().getFullYear();
    const currentMonth = periodMonth ? parseInt(periodMonth) : null;

    // Build period filter
    let periodFilter = '';
    const periodParams = [locationId];

    switch (granularity) {
      case 'mese':
        if (currentMonth) {
          periodFilter = 'period_year = ? AND period_month = ?';
          periodParams.push(currentYear, currentMonth);
        }
        break;
      case 'trimestre':
        if (currentMonth) {
          const quarter = Math.ceil(currentMonth / 3);
          periodFilter =
            'period_year = ? AND period_month >= ? AND period_month <= ?';
          periodParams.push(currentYear, (quarter - 1) * 3 + 1, quarter * 3);
        }
        break;
      case 'quadrimestre':
        if (currentMonth) {
          const quadrimestre = Math.ceil(currentMonth / 4);
          periodFilter =
            'period_year = ? AND period_month >= ? AND period_month <= ?';
          periodParams.push(
            currentYear,
            (quadrimestre - 1) * 4 + 1,
            Math.min(quadrimestre * 4, 12)
          );
        }
        break;
      case 'semestre':
        if (currentMonth) {
          const semester = currentMonth <= 6 ? 1 : 2;
          periodFilter =
            'period_year = ? AND period_month >= ? AND period_month <= ?';
          periodParams.push(currentYear, (semester - 1) * 6 + 1, semester * 6);
        }
        break;
      case 'anno':
        periodFilter = 'period_year = ?';
        periodParams.push(currentYear);
        break;
      case 'totale':
        periodFilter = '1=1';
        break;
    }

    // Get KPIs - simplified query compatible with Supabase wrapper
    const allDishData = await db.query(
      'SELECT period_year, period_month, quantity, total_value, dish_id, recipe_id FROM sales_dish_data WHERE location_id = ?',
      [locationId]
    );

    // Filter by period in JavaScript
    let filteredData = allDishData;
    if (periodFilter && periodFilter !== '1=1') {
      filteredData = allDishData.filter(row => {
        switch (granularity) {
          case 'mese':
            return (
              row.period_year === currentYear &&
              row.period_month === currentMonth
            );
          case 'trimestre':
            const quarter = Math.ceil(currentMonth / 3);
            return (
              row.period_year === currentYear &&
              row.period_month >= (quarter - 1) * 3 + 1 &&
              row.period_month <= quarter * 3
            );
          case 'quadrimestre':
            const quadrimestre = Math.ceil(currentMonth / 4);
            return (
              row.period_year === currentYear &&
              row.period_month >= (quadrimestre - 1) * 4 + 1 &&
              row.period_month <= Math.min(quadrimestre * 4, 12)
            );
          case 'semestre':
            const semester = currentMonth <= 6 ? 1 : 2;
            return (
              row.period_year === currentYear &&
              row.period_month >= (semester - 1) * 6 + 1 &&
              row.period_month <= semester * 6
            );
          case 'anno':
            return row.period_year === currentYear;
          default:
            return true;
        }
      });
    }

    // Filter by category if specified
    if (category) {
      const dishesWithCategory = await db.query(
        'SELECT id FROM sales_dishes WHERE location_id = ? AND category_gestionale = ?',
        [locationId, category]
      );
      const dishIds = new Set(dishesWithCategory.map(d => d.id));
      filteredData = filteredData.filter(d => dishIds.has(d.dish_id));
    }

    // Filter by recipe if specified
    if (recipeId) {
      filteredData = filteredData.filter(d => d.recipe_id === recipeId);
    }

    // Calculate KPIs
    const totalQuantity = filteredData.reduce(
      (sum, d) => sum + (parseInt(d.quantity) || 0),
      0
    );
    const totalValue = filteredData.reduce(
      (sum, d) => sum + (parseFloat(d.total_value) || 0),
      0
    );
    const uniqueDishes = new Set(filteredData.map(d => d.dish_id)).size;
    const linkedDishesCount = new Set(
      filteredData.filter(d => d.recipe_id).map(d => d.dish_id)
    ).size;
    const averageTicket = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    // Get comparison data if requested
    let comparison = null;
    if (compareWithPrevious === 'true') {
      // Calculate previous period based on granularity
      // Simplified - would need proper date calculation
      comparison = {
        previousPeriod: {
          totalValue: 0,
          totalQuantity: 0,
          uniqueDishes: 0,
          averageTicket: 0,
        },
        changes: {
          value: 0,
          quantity: 0,
          uniqueDishes: 0,
          averageTicket: 0,
        },
      };
    }

    // Get sales trend data - simplified
    const trendDataRaw = await db.query(
      'SELECT period_year, period_month, quantity, total_value FROM sales_dish_data WHERE location_id = ?',
      [locationId]
    );

    // Group by period
    const trendMap = new Map();
    trendDataRaw.forEach(row => {
      const key = `${row.period_year}-${row.period_month}`;
      if (!trendMap.has(key)) {
        trendMap.set(key, {
          period_year: row.period_year,
          period_month: row.period_month,
          quantity: 0,
          total_value: 0,
        });
      }
      const entry = trendMap.get(key);
      entry.quantity += parseInt(row.quantity) || 0;
      entry.total_value += parseFloat(row.total_value) || 0;
    });

    const trendData = Array.from(trendMap.values())
      .filter(t => {
        if (granularity === 'totale') return true;
        if (granularity === 'anno') return t.period_year === currentYear;
        if (granularity === 'mese' && currentMonth) {
          return (
            t.period_year === currentYear && t.period_month === currentMonth
          );
        }
        // Add other filters as needed
        return true;
      })
      .sort((a, b) => {
        if (a.period_year !== b.period_year)
          return a.period_year - b.period_year;
        return a.period_month - b.period_month;
      });

    // Get category distribution - simplified (no JOIN)
    const allDishes = await db.query(
      'SELECT id, category_gestionale, dish_name_original, dish_name, recipe_id, is_linked FROM sales_dishes WHERE location_id = ?',
      [locationId]
    );
    const dishesMapById = new Map(allDishes.map(d => [d.id, d]));

    const categoryMap = new Map();
    allDishData.forEach(row => {
      const dish = dishesMapById.get(row.dish_id);
      const cat = dish?.category_gestionale || 'Sconosciuto';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { category: cat, quantity: 0, value: 0 });
      }
      const entry = categoryMap.get(cat);
      entry.quantity += parseInt(row.quantity) || 0;
      entry.value += parseFloat(row.total_value) || 0;
    });

    const categoryData = Array.from(categoryMap.values());
    const totalCategoryValue = categoryData.reduce(
      (sum, c) => sum + c.value,
      0
    );

    // Get top dishes - simplified (no JOIN)
    const dishMap = new Map();
    allDishData.forEach(row => {
      const dish = dishesMapById.get(row.dish_id);
      if (!dish) return;

      if (!dishMap.has(row.dish_id)) {
        dishMap.set(row.dish_id, {
          dish_id: row.dish_id,
          dish_name: dish.dish_name_original || dish.dish_name,
          quantity: 0,
          value: 0,
          recipe_id: dish.recipe_id,
          is_linked: dish.is_linked,
        });
      }
      const entry = dishMap.get(row.dish_id);
      entry.quantity += parseInt(row.quantity) || 0;
      entry.value += parseFloat(row.total_value) || 0;
    });

    const topDishes = Array.from(dishMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    res.json({
      kpis: {
        totalValue,
        totalQuantity,
        uniqueDishes,
        averageTicket,
        linkedDishesCount,
        unlinkedDishesCount: uniqueDishes - linkedDishesCount,
        trends: {
          value: { change: 0, trend: 'stable' },
          quantity: { change: 0, trend: 'stable' },
          uniqueDishes: { change: 0, trend: 'stable' },
          averageTicket: { change: 0, trend: 'stable' },
        },
        comparison,
      },
      charts: {
        salesTrend: trendData.map(t => ({
          date: `${t.period_year}-${String(t.period_month).padStart(2, '0')}-01`,
          total: t.total_value,
          linked: 0, // Would need to calculate separately
          unlinked: 0,
        })),
        categoryDistribution: categoryData.map(c => ({
          category: c.category,
          quantity: c.quantity,
          value: c.value,
          percentage:
            totalCategoryValue > 0 ? (c.value / totalCategoryValue) * 100 : 0,
        })),
        topDishes: topDishes.map(d => ({
          dishId: d.dish_id,
          dishName: d.dish_name,
          quantity: d.quantity,
          value: d.value,
          isLinked: d.is_linked,
          recipeId: d.recipe_id,
        })),
        forecast: {
          historical: [],
          predicted: [],
        },
      },
      table: {
        dishes: [],
        total: 0,
        pagination: {
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Serve React app for all non-API routes (SPA routing)
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

process.on('SIGINT', () => {
  // No database connections to close with Supabase
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RistoManager backend listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL || 'using default'}`);
  console.log(`Supabase Key configured: ${!!process.env.SUPABASE_KEY}`);
});
