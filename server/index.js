const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { masterDb, getLocationDb } = require('./supabase-wrapper');

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

    // System prompt - Expert in restaurant financial management
    const systemPrompt = `Sei un ESPERTO DI GESTIONE FINANZIARIA AZIENDALE SPECIALIZZATO IN RISTORAZIONE.

RUOLO E COMPETENZE:
- Sei un consulente finanziario esperto con anni di esperienza nella gestione finanziaria di ristoranti
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
${financialContext}`;

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

      const db = getDatabase(locationId);
      const materials = await db.query(
        'SELECT * FROM raw_materials WHERE location_id = ? ORDER BY categoria, materia_prima',
        [locationId]
      );

      res.json(materials);
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
    const marginalita = prezzoVendita > 0 ? (utile / prezzoVendita) * 100 : 0;

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
      const ingId = crypto.randomUUID();
      await db.run(
        'INSERT INTO recipe_ingredients (id, recipe_id, cod_materia, materia_prima, unita_misura, peso, costo) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          ingId,
          id,
          ing.codMateria,
          ing.materiaPrima,
          ing.unitaMisura,
          ing.peso,
          ing.costo,
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
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

app.put('/api/menu-engineering/recipes/:id', requireAuth, async (req, res) => {
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
      const marginalita = prezzoVendita > 0 ? (utile / prezzoVendita) * 100 : 0;

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
        const ingId = crypto.randomUUID();
        await db.run(
          'INSERT INTO recipe_ingredients (id, recipe_id, cod_materia, materia_prima, unita_misura, peso, costo) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            ingId,
            id,
            ing.codMateria,
            ing.materiaPrima,
            ing.unitaMisura,
            ing.peso,
            ing.costo,
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
    res.status(500).json({ error: 'Failed to update recipe' });
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

    const db = getDatabase(locationId);
    const sales = await db.query(
      'SELECT * FROM recipe_sales WHERE location_id = ? ORDER BY sale_date DESC',
      [locationId]
    );

    res.json(sales);
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
