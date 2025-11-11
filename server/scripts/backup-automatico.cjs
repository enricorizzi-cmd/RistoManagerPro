#!/usr/bin/env node
/**
 * Script per backup automatico del database
 * 
 * ⚠️ NOTA: Questo script è per uso locale/test. 
 * Su Render, usa Render Scheduled Jobs che chiamano l'API endpoint direttamente.
 * 
 * Uso:
 *   node server/scripts/backup-automatico.cjs [locationId] [daysToKeep]
 * 
 * Esempi:
 *   # Backup completo (tutte le locations)
 *   node server/scripts/backup-automatico.cjs
 * 
 *   # Backup di una location specifica
 *   node server/scripts/backup-automatico.cjs location-id-123
 * 
 * Per Render Production:
 *   Usa Render Scheduled Jobs che chiamano:
 *   POST https://your-app.onrender.com/api/backup/create
 *   
 *   Vedi BACKUP_SETUP_RENDER.md per dettagli.
 */

const path = require('path');

// Aggiungi il percorso del progetto al require path
const projectRoot = path.resolve(__dirname, '../..');
process.chdir(projectRoot);

const {
  createFullBackup,
  createLocationBackup,
  cleanupOldBackups,
} = require('../backup-service');

async function main() {
  const locationId = process.argv[2] || null;
  const daysToKeep = parseInt(process.argv[3]) || 30;

  console.log('='.repeat(60));
  console.log('BACKUP AUTOMATICO - RistoManager Pro');
  console.log('='.repeat(60));
  console.log(`Data/Ora: ${new Date().toISOString()}`);
  console.log(`Location: ${locationId || 'Tutte'}`);
  console.log('');

  try {
    // Crea il backup
    console.log('Creazione backup in corso...');
    const result = locationId
      ? await createLocationBackup(locationId)
      : await createFullBackup();

    if (result.success) {
      console.log('');
      console.log('✓ Backup completato con successo!');
      console.log(`  File: ${result.backupPath}`);
      console.log(`  Tabelle: ${result.tables}`);
      console.log(`  Record: ${result.records}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`  ⚠️  Errori: ${result.errors.length} tabella(e) con errori`);
        result.errors.forEach(err => {
          console.log(`     - ${err.table}: ${err.error}`);
        });
      }
    } else {
      console.log('');
      console.log('⚠️  Backup completato con errori');
      console.log(`  File: ${result.backupPath}`);
      console.log(`  Tabelle: ${result.tables}`);
      console.log(`  Record: ${result.records}`);
      if (result.errors) {
        result.errors.forEach(err => {
          console.log(`  ✗ ${err.table}: ${err.error}`);
        });
      }
    }

    // Cleanup backup vecchi
    console.log('');
    console.log(`Pulizia backup più vecchi di ${daysToKeep} giorni...`);
    const cleanupResult = await cleanupOldBackups(daysToKeep);
    if (cleanupResult.deleted > 0) {
      console.log(`✓ Eliminati ${cleanupResult.deleted} backup vecchi`);
    } else {
      console.log('✓ Nessun backup vecchio da eliminare');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Backup automatico completato');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('✗ ERRORE durante il backup:');
    console.error(error.message);
    console.error(error.stack);
    console.error('');
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Esegui lo script
main();

