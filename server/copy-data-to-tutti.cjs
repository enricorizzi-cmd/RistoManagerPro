// Script per copiare i dati delle aziende nell'entità "Tutti"
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('=== COPIA DATI AZIENDE IN "TUTTI" ===\n');

// Connessione al database master
const masterDbPath = path.join(__dirname, 'data', 'master.db');
const masterDb = new sqlite3.Database(masterDbPath);

// Funzione per ottenere tutte le locations attive (escluso "all")
function getActiveLocations() {
  return new Promise((resolve, reject) => {
    masterDb.all('SELECT id, name FROM locations WHERE status = "active" AND id != "all"', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Funzione per ottenere lo stato finanziario di una location
function getFinancialState(locationId) {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, 'data', `ristomanager_${locationId}.db`);
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT data FROM financial_plan_state WHERE id = ?', [`financial-plan-${locationId}`], (err, row) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(row ? JSON.parse(row.data) : null);
      }
    });
  });
}

// Funzione per salvare lo stato aggregato in "Tutti"
function saveAggregatedState(aggregatedData) {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, 'data', 'ristomanager_all.db');
    const db = new sqlite3.Database(dbPath);
    
    const now = new Date().toISOString();
    const data = JSON.stringify(aggregatedData);
    
    db.run(
      `INSERT INTO financial_plan_state (id, data, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      ['financial-plan-all', data, now],
      function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

// Funzione principale per aggregare i dati
async function aggregateData() {
  try {
    console.log('1. Ottenendo locations attive...');
    const locations = await getActiveLocations();
    console.log(`   ✅ Trovate ${locations.length} locations attive`);
    
    if (locations.length === 0) {
      console.log('   ⚠️  Nessuna location attiva trovata');
      return;
    }
    
    console.log('\n2. Aggregando dati finanziari...');
    
    // Inizializza l'oggetto aggregato
    let aggregatedData = {
      preventivoOverrides: {},
      consuntivoOverrides: {},
      manualLog: [],
      monthlyMetrics: [],
      statsOverrides: {},
      causaliCatalog: [],
      causaliVersion: null,
    };
    
    let processedLocations = 0;
    
    for (const location of locations) {
      try {
        console.log(`   📊 Processando ${location.name} (${location.id})...`);
        
        const financialState = await getFinancialState(location.id);
        
        if (financialState) {
          // Aggrega preventivoOverrides
          if (financialState.preventivoOverrides) {
            Object.keys(financialState.preventivoOverrides).forEach(key => {
              if (!aggregatedData.preventivoOverrides[key]) {
                aggregatedData.preventivoOverrides[key] = {};
              }
              Object.keys(financialState.preventivoOverrides[key]).forEach(subKey => {
                const currentValue = parseFloat(aggregatedData.preventivoOverrides[key][subKey]) || 0;
                const newValue = parseFloat(financialState.preventivoOverrides[key][subKey]) || 0;
                aggregatedData.preventivoOverrides[key][subKey] = currentValue + newValue;
              });
            });
          }
          
          // Aggrega consuntivoOverrides
          if (financialState.consuntivoOverrides) {
            Object.keys(financialState.consuntivoOverrides).forEach(key => {
              if (!aggregatedData.consuntivoOverrides[key]) {
                aggregatedData.consuntivoOverrides[key] = {};
              }
              Object.keys(financialState.consuntivoOverrides[key]).forEach(subKey => {
                const currentValue = parseFloat(aggregatedData.consuntivoOverrides[key][subKey]) || 0;
                const newValue = parseFloat(financialState.consuntivoOverrides[key][subKey]) || 0;
                aggregatedData.consuntivoOverrides[key][subKey] = currentValue + newValue;
              });
            });
          }
          
          // Aggrega statsOverrides
          if (financialState.statsOverrides) {
            Object.keys(financialState.statsOverrides).forEach(key => {
              const currentValue = parseFloat(aggregatedData.statsOverrides[key]) || 0;
              const newValue = parseFloat(financialState.statsOverrides[key]) || 0;
              aggregatedData.statsOverrides[key] = currentValue + newValue;
            });
          }
          
          // Aggrega monthlyMetrics
          if (financialState.monthlyMetrics) {
            financialState.monthlyMetrics.forEach(metric => {
              const existingMetric = aggregatedData.monthlyMetrics.find(m => 
                m.year === metric.year && m.monthIndex === metric.monthIndex
              );
              if (existingMetric) {
                // Somma valori numerici
                Object.keys(metric).forEach(key => {
                  if (typeof metric[key] === 'number') {
                    existingMetric[key] = (existingMetric[key] || 0) + metric[key];
                  }
                });
              } else {
                aggregatedData.monthlyMetrics.push({...metric});
              }
            });
          }
          
          // Aggrega causaliCatalog (prendi l'ultima versione)
          if (financialState.causaliCatalog && financialState.causaliCatalog.length > 0) {
            aggregatedData.causaliCatalog = financialState.causaliCatalog;
            aggregatedData.causaliVersion = financialState.causaliVersion;
          }
          
          processedLocations++;
          console.log(`   ✅ ${location.name}: dati aggregati`);
        } else {
          console.log(`   ⚠️  ${location.name}: nessun dato finanziario trovato`);
        }
      } catch (error) {
        console.log(`   ❌ ${location.name}: errore - ${error.message}`);
      }
    }
    
    console.log(`\n3. Salvando dati aggregati in "Tutti"...`);
    console.log(`   📊 Locations processate: ${processedLocations}/${locations.length}`);
    
    const changes = await saveAggregatedState(aggregatedData);
    
    if (changes > 0) {
      console.log('   ✅ Dati aggregati salvati con successo!');
      
      // Mostra statistiche
      console.log('\n📈 STATISTICHE AGGREGAZIONE:');
      console.log(`   - Preventivo Overrides: ${Object.keys(aggregatedData.preventivoOverrides).length} chiavi`);
      console.log(`   - Consuntivo Overrides: ${Object.keys(aggregatedData.consuntivoOverrides).length} chiavi`);
      console.log(`   - Stats Overrides: ${Object.keys(aggregatedData.statsOverrides).length} chiavi`);
      console.log(`   - Monthly Metrics: ${aggregatedData.monthlyMetrics.length} record`);
      console.log(`   - Causali Catalog: ${aggregatedData.causaliCatalog.length} voci`);
    } else {
      console.log('   ⚠️  Nessuna modifica salvata');
    }
    
  } catch (error) {
    console.error('❌ Errore durante l\'aggregazione:', error);
  } finally {
    masterDb.close();
  }
}

// Esegui l'aggregazione
aggregateData().then(() => {
  console.log('\n=== AGGREGAZIONE COMPLETATA ===');
  console.log('I dati delle aziende sono stati copiati in "Tutti"');
  console.log('Ora puoi testare la funzionalità nell\'interfaccia web');
}).catch(error => {
  console.error('Errore finale:', error);
});
