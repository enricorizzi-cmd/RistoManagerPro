// Script per creare e inizializzare il database "all"
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('=== INIZIALIZZAZIONE DATABASE "ALL" ===\n');

// Connessione al database "all"
const dbPath = path.join(__dirname, 'data', 'ristomanager_all.db');
const db = new sqlite3.Database(dbPath);

// Crea la tabella financial_plan_state se non esiste
db.run(`
  CREATE TABLE IF NOT EXISTS financial_plan_state (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at TEXT
  )
`, function(err) {
  if (err) {
    console.error('❌ Errore nella creazione della tabella:', err);
    db.close();
    return;
  }
  
  console.log('✅ Tabella financial_plan_state creata/verificata');
  
  // Inizializza con dati vuoti
  const now = new Date().toISOString();
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
    `INSERT INTO financial_plan_state (id, data, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    ['financial-plan-all', emptyData, now],
    function(err) {
      if (err) {
        console.error('❌ Errore nell\'inizializzazione:', err);
      } else {
        console.log('✅ Database "all" inizializzato con successo');
        console.log(`   - ID: financial-plan-all`);
        console.log(`   - Dati: ${emptyData.length} caratteri`);
        console.log(`   - Aggiornato: ${now}`);
      }
      
      db.close();
      console.log('\n=== INIZIALIZZAZIONE COMPLETATA ===');
    }
  );
});
