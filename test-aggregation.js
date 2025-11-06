// Test script per verificare l'aggregazione dei dati finanziari
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Test delle locations disponibili
console.log('=== TEST AGGREGAZIONE DATI FINANZIARI ===\n');

// Connessione al database master
const masterDbPath = path.join(__dirname, 'master.db');
const masterDb = new sqlite3.Database(masterDbPath);

console.log('1. Verifica entità "Tutti" nel database master:');
masterDb.get('SELECT * FROM locations WHERE id = "all"', (err, row) => {
  if (err) {
    console.error('Errore:', err);
    return;
  }
  
  if (row) {
    console.log('✅ Entità "Tutti" trovata:');
    console.log(`   ID: ${row.id}`);
    console.log(`   Nome: ${row.name}`);
    console.log(`   Status: ${row.status}`);
    console.log(`   Creata: ${row.created_at}\n`);
  } else {
    console.log('❌ Entità "Tutti" non trovata\n');
  }
});

// Test delle locations attive
console.log('2. Verifica locations attive:');
masterDb.all('SELECT id, name FROM locations WHERE status = "active" ORDER BY name', (err, rows) => {
  if (err) {
    console.error('Errore:', err);
    return;
  }
  
  console.log(`✅ Trovate ${rows.length} locations attive:`);
  rows.forEach(row => {
    console.log(`   - ${row.name} (${row.id})`);
  });
  console.log('');

  // Test dei database per ogni location
  console.log('3. Verifica database per ogni location:');
  rows.forEach(row => {
    const dbPath = path.join(__dirname, 'server', 'databases', `${row.id}.db`);
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT COUNT(*) as count FROM financial_plan_state', (err, result) => {
      if (err) {
        console.log(`   ❌ ${row.name}: Database non accessibile`);
      } else {
        console.log(`   ✅ ${row.name}: ${result.count} stati finanziari`);
      }
      
      db.close();
    });
  });
  
  masterDb.close();
});

console.log('\n=== TEST COMPLETATO ===');
console.log('Per testare l\'interfaccia:');
console.log('1. Apri http://localhost:5173');
console.log('2. Accedi come admin');
console.log('3. Vai su Piano Finanziario');
console.log('4. Verifica che "Tutti" appaia nel selettore aziende');
console.log('5. Seleziona "Tutti" per vedere i dati aggregati');
