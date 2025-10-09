// Script to migrate financial stats from static data to database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Import the static financial stats data
const { financialStats } = require('../data/financialPlanData.ts');

const DATABASE_DIR = path.join(__dirname, '../server/data');

// Ensure database directory exists
fs.mkdirSync(DATABASE_DIR, { recursive: true });

// Database connection manager
const dbConnections = new Map();

const getDatabase = (locationId) => {
  if (!dbConnections.has(locationId)) {
    const dbFile = path.join(DATABASE_DIR, `ristomanager_${locationId}.db`);
    const db = new sqlite3.Database(dbFile);
    
    // Initialize financial_stats table
    db.run(`CREATE TABLE IF NOT EXISTS financial_stats (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      month TEXT NOT NULL,
      fatturato_totale REAL,
      fatturato_imponibile REAL,
      fatturato_previsionale REAL,
      incassato REAL,
      incassato_previsionale REAL,
      utile REAL,
      utile_previsionale REAL,
      debiti_fornitore REAL,
      debiti_bancari REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(location_id, month)
    )`);
    
    dbConnections.set(locationId, db);
  }
  return dbConnections.get(locationId);
};

// Function to migrate stats for a location
const migrateStatsForLocation = (locationId) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase(locationId);
    const now = new Date().toISOString();
    
    // Clear existing stats for this location
    db.run('DELETE FROM financial_stats WHERE location_id = ?', [locationId], (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Insert static stats data
      let completed = 0;
      const total = financialStats.length;
      
      if (total === 0) {
        resolve();
        return;
      }
      
      financialStats.forEach((stat) => {
        const statId = `stat-${locationId}-${stat.month.replace(/\s+/g, '-')}`;
        
        db.run(`
          INSERT INTO financial_stats (
            id, location_id, month, fatturato_totale, fatturato_imponibile, 
            fatturato_previsionale, incassato, incassato_previsionale, 
            utile, utile_previsionale, debiti_fornitore, debiti_bancari,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          statId, locationId, stat.month,
          stat.fatturatoTotale || null, stat.fatturatoImponibile || null,
          stat.fatturatoPrevisionale || null, stat.incassato || null,
          stat.incassatoPrevisionale || null, stat.utile || null,
          stat.utilePrevisionale || null, stat.debitiFornitore || null,
          stat.debitiBancari || null, now, now
        ], (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          completed++;
          if (completed === total) {
            resolve();
          }
        });
      });
    });
  });
};

// Main migration function
const migrateAllStats = async () => {
  try {
    console.log('Starting financial stats migration...');
    
    // Get all location databases
    const dbFiles = fs.readdirSync(DATABASE_DIR)
      .filter(file => file.startsWith('ristomanager_') && file.endsWith('.db'))
      .map(file => file.replace('ristomanager_', '').replace('.db', ''));
    
    console.log(`Found ${dbFiles.length} location databases:`, dbFiles);
    
    // Migrate stats for each location
    for (const locationId of dbFiles) {
      console.log(`Migrating stats for location: ${locationId}`);
      await migrateStatsForLocation(locationId);
      console.log(`✓ Completed migration for ${locationId}`);
    }
    
    console.log('✅ All financial stats migrated successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close all database connections
    dbConnections.forEach(db => db.close());
  }
};

// Run migration
migrateAllStats();
