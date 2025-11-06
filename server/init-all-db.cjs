const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('Inizializzazione database "all"...');

const dbPath = path.join(__dirname, 'data', 'ristomanager_all.db');
console.log('Percorso database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Errore apertura database:', err);
    return;
  }
  console.log('Database aperto con successo');
});

// Crea tabella
db.run(`
  CREATE TABLE IF NOT EXISTS financial_plan_state (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at TEXT
  )
`, (err) => {
  if (err) {
    console.error('Errore creazione tabella:', err);
  } else {
    console.log('Tabella creata/verificata');
  }
  
  // Inserisci dati vuoti
  const emptyData = JSON.stringify({
    preventivoOverrides: {},
    consuntivoOverrides: {},
    manualLog: [],
    monthlyMetrics: [],
    statsOverrides: {},
    causaliCatalog: [],
    causaliVersion: null,
  });
  
  db.run(
    `INSERT OR REPLACE INTO financial_plan_state (id, data, updated_at) VALUES (?, ?, ?)`,
    ['financial-plan-all', emptyData, new Date().toISOString()],
    (err) => {
      if (err) {
        console.error('Errore inserimento:', err);
      } else {
        console.log('Database "all" inizializzato');
      }
      db.close();
    }
  );
});
