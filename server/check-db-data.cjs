const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('=== VERIFICA DATI DATABASE ===\n');

// Verifica locations nel master.db
const masterDb = new sqlite3.Database(path.join(__dirname, 'data', 'master.db'));

console.log('1. Locations nel database master:');
masterDb.all('SELECT id, name, status FROM locations ORDER BY name', (err, rows) => {
  if (err) {
    console.error('Errore:', err);
  } else {
    console.log(`   Trovate ${rows.length} locations:`);
    rows.forEach(row => {
      console.log(`   - ${row.name} (${row.id}) - Status: ${row.status}`);
    });
  }
  
  console.log('\n2. Verifica dati finanziari per ogni location:');
  
  // Verifica dati finanziari per ogni location attiva
  rows.filter(row => row.status === 'active').forEach(location => {
    const dbPath = path.join(__dirname, 'data', `ristomanager_${location.id}.db`);
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT COUNT(*) as count FROM financial_plan_state', (err, result) => {
      if (err) {
        console.log(`   ❌ ${location.name}: Database non accessibile`);
      } else {
        console.log(`   ✅ ${location.name}: ${result.count} stati finanziari`);
        
        // Se ci sono dati, mostra i dettagli
        if (result.count > 0) {
          db.get('SELECT id, updated_at FROM financial_plan_state LIMIT 1', (err, row) => {
            if (!err && row) {
              console.log(`      - ID: ${row.id}`);
              console.log(`      - Aggiornato: ${row.updated_at}`);
            }
          });
        }
      }
      db.close();
    });
  });
  
  console.log('\n3. Verifica database "all":');
  const allDbPath = path.join(__dirname, 'data', 'ristomanager_all.db');
  const allDb = new sqlite3.Database(allDbPath);
  
  allDb.get('SELECT COUNT(*) as count FROM financial_plan_state', (err, result) => {
    if (err) {
      console.log('   ❌ Database "all" non accessibile');
    } else {
      console.log(`   ✅ Database "all": ${result.count} stati finanziari`);
      
      if (result.count > 0) {
        allDb.get('SELECT id, data, updated_at FROM financial_plan_state LIMIT 1', (err, row) => {
          if (!err && row) {
            console.log(`      - ID: ${row.id}`);
            console.log(`      - Aggiornato: ${row.updated_at}`);
            try {
              const data = JSON.parse(row.data);
              console.log(`      - Preventivo Overrides: ${Object.keys(data.preventivoOverrides || {}).length} chiavi`);
              console.log(`      - Consuntivo Overrides: ${Object.keys(data.consuntivoOverrides || {}).length} chiavi`);
              console.log(`      - Stats Overrides: ${Object.keys(data.statsOverrides || {}).length} chiavi`);
              console.log(`      - Monthly Metrics: ${(data.monthlyMetrics || []).length} record`);
            } catch (e) {
              console.log('      - Errore parsing dati JSON');
            }
          }
          allDb.close();
          masterDb.close();
        });
      } else {
        allDb.close();
        masterDb.close();
      }
    }
  });
});
