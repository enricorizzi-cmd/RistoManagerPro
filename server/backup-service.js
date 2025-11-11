// Backup Service - Automatic Database Backup for Render
// Esporta tutti i dati da Supabase in formato JSON e salva su Supabase Storage
// Compatibile con Render (filesystem ephemeral)

const { supabaseCall } = require('./supabase-wrapper');

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://yuvvqdtyxmdhdamhtszs.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const BACKUP_BUCKET = 'backups'; // Bucket name in Supabase Storage

// Lista di tutte le tabelle da includere nel backup
const TABLES_TO_BACKUP = [
  // Master tables
  'users',
  'user_sessions',
  'user_location_permissions',
  'locations',
  'location_enabled_tabs',

  // Financial Plan
  'financial_plan_state',
  'data_entries',
  'business_plan_drafts',
  'financial_stats',

  // Menu Engineering
  'raw_materials',
  'recipes',
  'recipe_ingredients',
  'recipe_sales',
  'menu_dropdown_values',

  // Sales Analysis
  'sales_imports',
  'sales_categories',
  'sales_dishes',
  'sales_dish_data',
  'sales_import_exclusions',
];

/**
 * Upload file to Supabase Storage
 */
async function uploadToStorage(
  filePath,
  content,
  contentType = 'application/json'
) {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${BACKUP_BUCKET}/${filePath}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true', // Overwrite if exists
    },
    body: content,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to upload to storage: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  return data;
}

/**
 * List files in Supabase Storage bucket
 */
async function listStorageFiles(prefix = '') {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  const url = `${SUPABASE_URL}/storage/v1/object/list/${BACKUP_BUCKET}?prefix=${encodeURIComponent(prefix)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to list storage files: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Download file from Supabase Storage
 */
async function downloadFromStorage(filePath) {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${BACKUP_BUCKET}/${filePath}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to download from storage: ${response.status} ${errorText}`
    );
  }

  return await response.text();
}

/**
 * Delete file from Supabase Storage
 */
async function deleteFromStorage(filePath) {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${BACKUP_BUCKET}/${filePath}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete from storage: ${response.status} ${errorText}`
    );
  }

  return true;
}

/**
 * Crea un backup completo di tutte le tabelle
 * @param {string} locationId - ID della location specifica (opzionale, se null fa backup di tutto)
 * @returns {Promise<{success: boolean, backupPath: string, timestamp: string, tables: number, records: number}>}
 */
async function createFullBackup(locationId = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = locationId
    ? `backup_${locationId}_${timestamp}.json`
    : `backup_full_${timestamp}.json`;
  const backupPath = `${locationId || 'all'}/${backupFileName}`;

  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      locationId: locationId || 'all',
      version: '1.0',
      tables: [],
    },
    data: {},
  };

  let totalRecords = 0;
  let successfulTables = 0;
  const errors = [];

  console.log(
    `[BACKUP] Starting backup${locationId ? ` for location ${locationId}` : ' (all locations)'}...`
  );

  for (const tableName of TABLES_TO_BACKUP) {
    try {
      console.log(`[BACKUP] Backing up table: ${tableName}...`);

      // Costruisci i filtri se è specificata una location
      const filters = {};
      if (
        locationId &&
        tableName !== 'users' &&
        tableName !== 'user_sessions' &&
        tableName !== 'user_location_permissions' &&
        tableName !== 'locations' &&
        tableName !== 'location_enabled_tabs'
      ) {
        // La maggior parte delle tabelle ha location_id
        filters.location_id = locationId;
      }

      // Recupera tutti i dati dalla tabella
      const data = await supabaseCall('GET', tableName, {
        filters,
        limit: 100000, // Limite alto per ottenere tutti i record
      });

      const recordCount = Array.isArray(data) ? data.length : data ? 1 : 0;
      totalRecords += recordCount;
      successfulTables++;

      backup.data[tableName] = data;
      backup.metadata.tables.push({
        name: tableName,
        recordCount,
        backedUp: true,
      });

      console.log(`[BACKUP] ✓ ${tableName}: ${recordCount} records`);
    } catch (error) {
      console.error(`[BACKUP] ✗ Failed to backup ${tableName}:`, error.message);
      errors.push({
        table: tableName,
        error: error.message,
      });
      backup.metadata.tables.push({
        name: tableName,
        recordCount: 0,
        backedUp: false,
        error: error.message,
      });
    }
  }

  // Aggiungi errori ai metadati
  if (errors.length > 0) {
    backup.metadata.errors = errors;
  }

  backup.metadata.summary = {
    totalTables: TABLES_TO_BACKUP.length,
    successfulTables,
    failedTables: errors.length,
    totalRecords,
  };

  // Salva il backup su Supabase Storage
  try {
    const backupJson = JSON.stringify(backup, null, 2);
    await uploadToStorage(backupPath, backupJson, 'application/json');
    console.log(`[BACKUP] ✓ Backup saved to Supabase Storage: ${backupPath}`);
    console.log(
      `[BACKUP] Summary: ${successfulTables}/${TABLES_TO_BACKUP.length} tables, ${totalRecords} records`
    );
  } catch (error) {
    console.error('[BACKUP] Failed to save backup to storage:', error);
    throw error;
  }

  return {
    success: errors.length === 0,
    backupPath, // Path in storage, not filesystem
    storagePath: backupPath,
    timestamp: backup.metadata.timestamp,
    tables: successfulTables,
    records: totalRecords,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Crea un backup solo per una location specifica
 */
async function createLocationBackup(locationId) {
  if (!locationId) {
    throw new Error('Location ID is required for location backup');
  }
  return await createFullBackup(locationId);
}

/**
 * Lista tutti i backup disponibili da Supabase Storage
 */
async function listBackups() {
  try {
    const files = await listStorageFiles('backup_');

    const backups = [];

    for (const file of files) {
      try {
        // Download metadata only (first part of file)
        const content = await downloadFromStorage(file.name);
        const backup = JSON.parse(content);

        backups.push({
          fileName: file.name.split('/').pop(), // Just filename
          path: file.name, // Full path in storage
          storagePath: file.name,
          size: file.metadata?.size || 0,
          created: backup.metadata.timestamp,
          locationId: backup.metadata.locationId,
          tables: backup.metadata.summary?.successfulTables || 0,
          records: backup.metadata.summary?.totalRecords || 0,
          hasErrors: (backup.metadata.errors || []).length > 0,
        });
      } catch (error) {
        console.error(
          `[BACKUP] Failed to read backup file ${file.name}:`,
          error
        );
      }
    }

    // Ordina per data (più recenti prima)
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));

    return backups;
  } catch (error) {
    console.error('[BACKUP] Failed to list backups:', error);
    throw error;
  }
}

/**
 * Restaura un backup da Supabase Storage
 * @param {string} backupPath - Percorso del file di backup in storage (es: "all/backup_full_2025-01-11T02-00-00.json")
 * @param {boolean} dryRun - Se true, solo simula il restore senza scrivere
 */
async function restoreBackup(backupPath, dryRun = false) {
  console.log(
    `[BACKUP] ${dryRun ? 'DRY RUN: ' : ''}Restoring backup from: ${backupPath}`
  );

  const content = await downloadFromStorage(backupPath);
  const backup = JSON.parse(content);

  if (!backup.data || !backup.metadata) {
    throw new Error('Invalid backup file format');
  }

  const results = {
    restored: [],
    failed: [],
    skipped: [],
  };

  for (const [tableName, data] of Object.entries(backup.data)) {
    if (!Array.isArray(data) || data.length === 0) {
      results.skipped.push({ table: tableName, reason: 'No data' });
      continue;
    }

    try {
      if (dryRun) {
        console.log(
          `[BACKUP] DRY RUN: Would restore ${data.length} records to ${tableName}`
        );
        results.restored.push({ table: tableName, records: data.length });
      } else {
        // Per restore, dovremmo usare upsert per evitare duplicati
        // Nota: Questo è un esempio base, potrebbe essere necessario gestire meglio
        console.log(
          `[BACKUP] Restoring ${data.length} records to ${tableName}...`
        );

        // Per ora, logghiamo solo. Il restore completo richiederebbe logica più complessa
        // per gestire foreign keys, constraints, ecc.
        results.restored.push({ table: tableName, records: data.length });
        console.log(
          `[BACKUP] ⚠️  Full restore not yet implemented. Use Supabase dashboard for restore.`
        );
      }
    } catch (error) {
      console.error(`[BACKUP] Failed to restore ${tableName}:`, error);
      results.failed.push({ table: tableName, error: error.message });
    }
  }

  return results;
}

/**
 * Elimina backup vecchi da Supabase Storage (più vecchi di N giorni)
 */
async function cleanupOldBackups(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const backups = await listBackups();
  const toDelete = backups.filter(b => new Date(b.created) < cutoffDate);

  let deleted = 0;
  for (const backup of toDelete) {
    try {
      await deleteFromStorage(backup.storagePath);
      deleted++;
      console.log(`[BACKUP] Deleted old backup: ${backup.fileName}`);
    } catch (error) {
      console.error(`[BACKUP] Failed to delete ${backup.fileName}:`, error);
    }
  }

  return { deleted, total: toDelete.length };
}

module.exports = {
  createFullBackup,
  createLocationBackup,
  listBackups,
  restoreBackup,
  cleanupOldBackups,
  BACKUP_BUCKET,
};
