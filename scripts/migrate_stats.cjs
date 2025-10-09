// Script to migrate financial stats from static data to database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATABASE_DIR = path.join(__dirname, '../server/data');

// Static financial stats data (copied from the file)
const financialStats = [
  {
    "month": "Gen. 24",
    "fatturatoImponibile": 15000.0,
    "fatturatoTotale": 15000.0,
    "utileCassa": 2500.0,
    "incassato": 18000.0,
    "saldoConto": 5000.0,
    "saldoSecondoConto": 1000.0,
    "saldoTotale": 6000.0,
    "creditiPendenti": 2000.0,
    "creditiScaduti": 500.0,
    "debitiFornitore": 3000.0,
    "debitiBancari": 1500.0
  },
  {
    "month": "Feb. 24",
    "fatturatoImponibile": 16000.0,
    "fatturatoTotale": 16000.0,
    "utileCassa": 2800.0,
    "incassato": 19000.0,
    "saldoConto": 5500.0,
    "saldoSecondoConto": 1200.0,
    "saldoTotale": 6700.0,
    "creditiPendenti": 2200.0,
    "creditiScaduti": 600.0,
    "debitiFornitore": 3200.0,
    "debitiBancari": 1600.0
  },
  {
    "month": "Mar. 24",
    "fatturatoImponibile": 17000.0,
    "fatturatoTotale": 17000.0,
    "utileCassa": 3000.0,
    "incassato": 20000.0,
    "saldoConto": 6000.0,
    "saldoSecondoConto": 1400.0,
    "saldoTotale": 7400.0,
    "creditiPendenti": 2400.0,
    "creditiScaduti": 700.0,
    "debitiFornitore": 3400.0,
    "debitiBancari": 1700.0
  },
  {
    "month": "Apr. 24",
    "fatturatoImponibile": 18000.0,
    "fatturatoTotale": 18000.0,
    "utileCassa": 3200.0,
    "incassato": 21000.0,
    "saldoConto": 6500.0,
    "saldoSecondoConto": 1600.0,
    "saldoTotale": 8100.0,
    "creditiPendenti": 2600.0,
    "creditiScaduti": 800.0,
    "debitiFornitore": 3600.0,
    "debitiBancari": 1800.0
  },
  {
    "month": "Mag. 24",
    "fatturatoImponibile": 19000.0,
    "fatturatoTotale": 19000.0,
    "utileCassa": 3400.0,
    "incassato": 22000.0,
    "saldoConto": 7000.0,
    "saldoSecondoConto": 1800.0,
    "saldoTotale": 8800.0,
    "creditiPendenti": 2800.0,
    "creditiScaduti": 900.0,
    "debitiFornitore": 3800.0,
    "debitiBancari": 1900.0
  },
  {
    "month": "Giu. 24",
    "fatturatoImponibile": 20000.0,
    "fatturatoTotale": 20000.0,
    "utileCassa": 3600.0,
    "incassato": 23000.0,
    "saldoConto": 7500.0,
    "saldoSecondoConto": 2000.0,
    "saldoTotale": 9500.0,
    "creditiPendenti": 3000.0,
    "creditiScaduti": 1000.0,
    "debitiFornitore": 4000.0,
    "debitiBancari": 2000.0
  }
];

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
