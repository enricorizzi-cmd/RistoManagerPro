const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Supabase connection
const SUPABASE_URL = 'https://yuvvqdtyxmdhdamhtszs.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dnZxZHR5eG1kaGRhbWh0c3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzgwMjIsImV4cCI6MjA3Nzk1NDAyMn0.BW0F7tlFJfccZ7DCCtcGR_0jU79vDBaIuYtyQeTzo5E';

const DATABASE_DIR = path.join(__dirname, 'data');

// Helper per fare chiamate API a Supabase
async function supabaseUpsert(table, data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Errore upsert ${table}: ${response.status} - ${error}`);
  }

  return response;
}

// Helper per leggere dati da SQLite
function querySQLite(db, query) {
  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// Migra dati da master.db
async function migrateMasterDB() {
  console.log('📦 Migrazione dati da master.db...');
  const masterDbPath = path.join(DATABASE_DIR, 'master.db');

  if (!fs.existsSync(masterDbPath)) {
    console.log('⚠️  master.db non trovato, salto...');
    return;
  }

  const db = new sqlite3.Database(masterDbPath);

  try {
    // Migra locations
    console.log('  → Migrazione locations...');
    const locations = await querySQLite(db, 'SELECT * FROM locations');
    if (locations.length > 0) {
      for (const loc of locations) {
        await supabaseUpsert('locations', {
          id: loc.id,
          name: loc.name,
          capacity: loc.capacity,
          open_time: loc.open_time,
          close_time: loc.close_time,
          status: loc.status || 'active',
          created_at: loc.created_at || new Date().toISOString(),
          updated_at: loc.updated_at || new Date().toISOString(),
        });
      }
      console.log(`    ✓ Migrate ${locations.length} locations`);
    } else {
      console.log('    ℹ️  Nessuna location da migrare');
    }

    // Migra users
    console.log('  → Migrazione users...');
    const users = await querySQLite(db, 'SELECT * FROM users');
    if (users.length > 0) {
      for (const user of users) {
        await supabaseUpsert('users', {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          password_hash: user.password_hash,
          role: user.role || 'user',
          is_active: user.is_active !== undefined ? user.is_active : 1,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at || new Date().toISOString(),
        });
      }
      console.log(`    ✓ Migrate ${users.length} users`);
    } else {
      console.log('    ℹ️  Nessun user da migrare');
    }

    // Migra user_sessions
    console.log('  → Migrazione user_sessions...');
    const sessions = await querySQLite(db, 'SELECT * FROM user_sessions');
    if (sessions.length > 0) {
      for (const session of sessions) {
        await supabaseUpsert('user_sessions', {
          id: session.id,
          user_id: session.user_id,
          token: session.token,
          created_at: session.created_at || new Date().toISOString(),
          expires_at: session.expires_at || null,
        });
      }
      console.log(`    ✓ Migrate ${sessions.length} sessions`);
    } else {
      console.log('    ℹ️  Nessuna session da migrare');
    }

    // Migra user_location_permissions
    console.log('  → Migrazione user_location_permissions...');
    const permissions = await querySQLite(
      db,
      'SELECT * FROM user_location_permissions'
    );
    if (permissions.length > 0) {
      for (const perm of permissions) {
        await supabaseUpsert('user_location_permissions', {
          id: perm.id,
          user_id: perm.user_id,
          location_id: perm.location_id,
          created_at: perm.created_at || new Date().toISOString(),
        });
      }
      console.log(`    ✓ Migrate ${permissions.length} permissions`);
    } else {
      console.log('    ℹ️  Nessuna permission da migrare');
    }

    // Migra location_enabled_tabs
    console.log('  → Migrazione location_enabled_tabs...');
    const tabs = await querySQLite(db, 'SELECT * FROM location_enabled_tabs');
    if (tabs.length > 0) {
      for (const tab of tabs) {
        await supabaseUpsert('location_enabled_tabs', {
          id: tab.id,
          location_id: tab.location_id,
          tab_name: tab.tab_name,
          is_enabled: tab.is_enabled !== undefined ? tab.is_enabled : 1,
          created_at: tab.created_at || new Date().toISOString(),
          updated_at: tab.updated_at || new Date().toISOString(),
        });
      }
      console.log(`    ✓ Migrate ${tabs.length} tabs`);
    } else {
      console.log('    ℹ️  Nessun tab da migrare');
    }

    console.log('✅ Migrazione master.db completata!\n');
  } catch (error) {
    console.error('❌ Errore durante migrazione master.db:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Migra dati da un file ristomanager_*.db
async function migrateLocationDB(dbPath, locationId) {
  console.log(
    `📦 Migrazione dati da ${path.basename(dbPath)} (location: ${locationId})...`
  );

  if (!fs.existsSync(dbPath)) {
    console.log(`⚠️  ${path.basename(dbPath)} non trovato, salto...`);
    return;
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Migra financial_plan_state
    console.log(`  → Migrazione financial_plan_state...`);
    try {
      const financialStates = await querySQLite(
        db,
        'SELECT * FROM financial_plan_state'
      );
      if (financialStates.length > 0) {
        for (const state of financialStates) {
          let data;
          try {
            data =
              typeof state.data === 'string'
                ? JSON.parse(state.data)
                : state.data;
          } catch (e) {
            console.warn(
              `    ⚠️  Errore parsing JSON per financial_plan_state ${state.id}, salto...`
            );
            continue;
          }

          await supabaseUpsert('financial_plan_state', {
            id: state.id,
            location_id: locationId,
            data: data,
            updated_at: state.updated_at || new Date().toISOString(),
          });
        }
        console.log(
          `    ✓ Migrate ${financialStates.length} financial_plan_states`
        );
      } else {
        console.log('    ℹ️  Nessuno stato da migrare');
      }
    } catch (e) {
      console.log('    ℹ️  Tabella financial_plan_state non presente o vuota');
    }

    // Migra data_entries
    console.log(`  → Migrazione data_entries...`);
    try {
      const dataEntries = await querySQLite(db, 'SELECT * FROM data_entries');
      if (dataEntries.length > 0) {
        for (const entry of dataEntries) {
          await supabaseUpsert('data_entries', {
            id: entry.id,
            location_id: locationId,
            data_inserimento: entry.data_inserimento,
            mese: entry.mese,
            anno: entry.anno,
            tipologia_causale: entry.tipologia_causale,
            categoria: entry.categoria,
            causale: entry.causale,
            valore: entry.valore,
            created_at: entry.created_at || new Date().toISOString(),
            updated_at: entry.updated_at || new Date().toISOString(),
          });
        }
        console.log(`    ✓ Migrate ${dataEntries.length} data_entries`);
      } else {
        console.log('    ℹ️  Nessuna entry da migrare');
      }
    } catch (e) {
      console.log('    ℹ️  Tabella data_entries non presente o vuota');
    }

    // Migra business_plan_drafts
    console.log(`  → Migrazione business_plan_drafts...`);
    try {
      const drafts = await querySQLite(
        db,
        'SELECT * FROM business_plan_drafts'
      );
      if (drafts.length > 0) {
        for (const draft of drafts) {
          let data;
          try {
            data =
              typeof draft.data === 'string'
                ? JSON.parse(draft.data)
                : draft.data;
          } catch (e) {
            console.warn(
              `    ⚠️  Errore parsing JSON per business_plan_draft ${draft.id}, salto...`
            );
            continue;
          }

          await supabaseUpsert('business_plan_drafts', {
            id: draft.id,
            location_id: locationId,
            target_year: draft.target_year,
            name: draft.name || 'Bozza',
            data: data,
            created_at: draft.created_at || new Date().toISOString(),
            updated_at: draft.updated_at || new Date().toISOString(),
          });
        }
        console.log(`    ✓ Migrate ${drafts.length} business_plan_drafts`);
      } else {
        console.log('    ℹ️  Nessuna draft da migrare');
      }
    } catch (e) {
      console.log('    ℹ️  Tabella business_plan_drafts non presente o vuota');
    }

    // Migra financial_stats
    console.log(`  → Migrazione financial_stats...`);
    try {
      const stats = await querySQLite(db, 'SELECT * FROM financial_stats');
      if (stats.length > 0) {
        for (const stat of stats) {
          await supabaseUpsert('financial_stats', {
            id: stat.id,
            location_id: locationId,
            month: stat.month,
            fatturato_totale: stat.fatturato_totale || null,
            fatturato_imponibile: stat.fatturato_imponibile || null,
            fatturato_previsionale: stat.fatturato_previsionale || null,
            incassato: stat.incassato || null,
            incassato_previsionale: stat.incassato_previsionale || null,
            utile: stat.utile || null,
            utile_previsionale: stat.utile_previsionale || null,
            debiti_fornitore: stat.debiti_fornitore || null,
            debiti_bancari: stat.debiti_bancari || null,
            created_at: stat.created_at || new Date().toISOString(),
            updated_at: stat.updated_at || new Date().toISOString(),
          });
        }
        console.log(`    ✓ Migrate ${stats.length} financial_stats`);
      } else {
        console.log('    ℹ️  Nessuna stat da migrare');
      }
    } catch (e) {
      console.log('    ℹ️  Tabella financial_stats non presente o vuota');
    }

    console.log(`✅ Migrazione ${path.basename(dbPath)} completata!\n`);
  } catch (error) {
    console.error(
      `❌ Errore durante migrazione ${path.basename(dbPath)}:`,
      error.message
    );
    throw error;
  } finally {
    db.close();
  }
}

// Funzione principale
async function main() {
  console.log('🚀 Inizio migrazione dati da SQLite locale a Supabase...\n');

  try {
    // Migra master.db
    await migrateMasterDB();

    // Trova tutti i file ristomanager_*.db
    const files = fs
      .readdirSync(DATABASE_DIR)
      .filter(f => f.startsWith('ristomanager_') && f.endsWith('.db'))
      .filter(f => f !== 'ristomanager_all.db'); // Escludi file aggregati

    console.log(
      `📁 Trovati ${files.length} file database location da migrare\n`
    );

    // Migra ogni file location
    for (const file of files) {
      // Estrai location_id dal nome file (ristomanager_<location_id>.db)
      const locationId = file.replace('ristomanager_', '').replace('.db', '');
      const dbPath = path.join(DATABASE_DIR, file);

      await migrateLocationDB(dbPath, locationId);
    }

    console.log('🎉 Migrazione completata con successo!');
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error.message);
    process.exit(1);
  }
}

// Esegui migrazione
main();
