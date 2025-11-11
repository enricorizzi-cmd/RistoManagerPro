# 🔄 Sistema di Backup Automatico - RistoManager Pro (Render)

## 📋 Panoramica

Il sistema di backup automatico è configurato per funzionare su **Render** utilizzando:
- **Supabase Storage** per salvare i backup (non filesystem locale - ephemeral su Render)
- **Render Scheduled Jobs** per backup automatici programmati
- **API REST** per backup manuali

---

## 🚀 Configurazione Iniziale

### 1. Creare Bucket Supabase Storage

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il progetto
3. Vai su **Storage** → **Buckets**
4. Clicca **New Bucket**
5. Nome: `backups`
6. Tipo: **Private** (raccomandato per sicurezza)
7. Clicca **Create Bucket**

### 2. Configurare Variabili d'Ambiente su Render

Nel dashboard Render, vai su **Environment** e aggiungi:

```bash
SUPABASE_URL=https://yuvvqdtyxmdhdamhtszs.supabase.co
SUPABASE_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**⚠️ IMPORTANTE**: `SUPABASE_SERVICE_ROLE_KEY` è necessario per accedere a Supabase Storage. 
- Trovalo in Supabase Dashboard → Settings → API → Service Role Key
- **NON esporre questa chiave nel frontend!**

---

## 📥 Backup Manuale via API

### Creare un backup completo

```bash
curl -X POST https://your-app.onrender.com/api/backup/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Creare backup di una location specifica

```bash
curl -X POST https://your-app.onrender.com/api/backup/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"locationId": "location-id-123"}'
```

### Listare tutti i backup

```bash
curl -X GET https://your-app.onrender.com/api/backup/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⏰ Backup Automatico con Render Scheduled Jobs

Render supporta **Scheduled Jobs** (Cron Jobs) per eseguire script a intervalli regolari.

### Creare Scheduled Job su Render

1. Vai su Render Dashboard → **New** → **Scheduled Job**
2. Configurazione:
   - **Name**: `RistoManager Backup Automatico`
   - **Schedule**: `0 2 * * *` (ogni giorno alle 2:00 AM UTC)
   - **Command**: 
     ```bash
     curl -X POST https://your-app.onrender.com/api/backup/create \
       -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
       -H "Content-Type: application/json"
     ```
   - **Environment**: Stesso del web service
   - **Variables**: Copia tutte le variabili d'ambiente dal web service

### Schedule Alternativi

- **Backup giornaliero alle 2:00 AM**: `0 2 * * *`
- **Backup ogni 12 ore**: `0 */12 * * *`
- **Backup ogni 6 ore**: `0 */6 * * *`
- **Backup settimanale (Lunedì 2:00 AM)**: `0 2 * * 1`

### Usare Script Personalizzato

Se preferisci usare lo script Node.js:

1. Crea un endpoint API dedicato per il cron job:
   ```javascript
   // In server/index.js
   app.post('/api/backup/scheduled', async (req, res) => {
     // Verifica token segreto per sicurezza
     if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
       return res.status(403).json({ error: 'Unauthorized' });
     }
     
     const result = await createFullBackup();
     res.json({ success: true, result });
   });
   ```

2. Configura Scheduled Job:
   ```bash
   curl -X POST https://your-app.onrender.com/api/backup/scheduled \
     -H "X-Cron-Secret: YOUR_SECRET_TOKEN"
   ```

---

## 📁 Struttura Backup in Supabase Storage

I backup vengono salvati in: `backups/` bucket

Formato path: `{locationId|all}/backup_{locationId}_YYYY-MM-DDTHH-mm-ss.json`

Esempio:
```
backups/
  ├── all/backup_full_2025-01-11T02-00-00.json
  ├── location-1/backup_location-1_2025-01-11T08-00-00.json
  └── location-2/backup_location-2_2025-01-11T14-00-00.json
```

### Struttura File Backup

```json
{
  "metadata": {
    "timestamp": "2025-01-11T02:00:00.000Z",
    "locationId": "all",
    "version": "1.0",
    "tables": [
      {
        "name": "users",
        "recordCount": 10,
        "backedUp": true
      }
    ],
    "summary": {
      "totalTables": 20,
      "successfulTables": 20,
      "failedTables": 0,
      "totalRecords": 1234
    }
  },
  "data": {
    "users": [...],
    "recipes": [...],
    ...
  }
}
```

---

## 🧹 Pulizia Backup Vecchi

I backup vengono automaticamente puliti dopo 30 giorni (configurabile).

### Pulizia Manuale via API

```bash
curl -X POST https://your-app.onrender.com/api/backup/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 30}'
```

### Pulizia Automatica

Aggiungi al Scheduled Job:

```bash
# Dopo il backup, pulisci i vecchi
curl -X POST https://your-app.onrender.com/api/backup/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 30}'
```

---

## 🔄 Restore da Backup

⚠️ **ATTENZIONE**: Il restore completo non è ancora implementato via API per motivi di sicurezza.

### Opzioni per Restore

1. **Supabase Dashboard** (Raccomandato)
   - Vai a Supabase Dashboard → Storage → Buckets → `backups`
   - Scarica il file backup JSON
   - Usa Supabase SQL Editor per inserire i dati manualmente

2. **Via API** (Solo Dry Run)
   ```bash
   curl -X POST https://your-app.onrender.com/api/backup/restore \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "storagePath": "all/backup_full_2025-01-11T02-00-00.json",
       "confirm": true
     }'
   ```

---

## 📊 Monitoraggio

### Verificare Backup Recenti

```bash
# Lista backup via API
curl -X GET https://your-app.onrender.com/api/backup/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verificare Log Backup

1. Vai su Render Dashboard → **Logs**
2. Cerca log con prefisso `[BACKUP]`
3. Verifica che i backup vengano creati correttamente

---

## ⚙️ Configurazione Avanzata

### Variabili d'Ambiente Richieste

- `SUPABASE_URL` - URL del progetto Supabase
- `SUPABASE_KEY` - Anon Key (per operazioni pubbliche)
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key (per Storage access)

### Personalizzare Tabelle da Backup

Modifica `server/backup-service.js`:
```javascript
const TABLES_TO_BACKUP = [
  'users',
  'recipes',
  // Aggiungi/rimuovi tabelle qui
];
```

---

## 🛡️ Sicurezza

### Permessi

- Solo utenti **admin** possono creare/gestire backup via API
- I backup sono salvati in bucket **Private** su Supabase Storage
- Service Role Key è necessario per accesso Storage (non esporre nel frontend!)

### Best Practices

1. ✅ Esegui backup regolari (almeno giornalieri)
2. ✅ Mantieni backup in Supabase Storage (persistente)
3. ✅ Testa periodicamente il restore
4. ✅ Monitora lo spazio Storage su Supabase
5. ✅ Configura pulizia automatica backup vecchi

---

## 📝 Checklist Setup

- [ ] Bucket `backups` creato su Supabase Storage
- [ ] Variabile `SUPABASE_SERVICE_ROLE_KEY` configurata su Render
- [ ] Test backup manuale via API
- [ ] Render Scheduled Job configurato per backup automatici
- [ ] Verificare che i backup vengano creati correttamente
- [ ] Configurare pulizia automatica backup vecchi
- [ ] Testare restore (in ambiente di test)
- [ ] Documentare procedure di restore per il team
- [ ] Configurare monitoring/alerting

---

## 🆘 Troubleshooting

### Backup fallisce con "SUPABASE_SERVICE_ROLE_KEY not configured"

- Verifica che la variabile d'ambiente sia configurata su Render
- Verifica che la chiave sia corretta (Service Role Key, non Anon Key)

### Backup fallisce con "Failed to upload to storage"

- Verifica che il bucket `backups` esista su Supabase Storage
- Verifica che la Service Role Key abbia permessi per Storage
- Controlla i log Render per errori specifici

### Scheduled Job non esegue

1. Verifica che il Scheduled Job sia attivo su Render
2. Controlla i log del Scheduled Job
3. Verifica che l'URL dell'API sia corretto
4. Verifica che il token di autenticazione sia valido

### Backup troppo grandi

- Considera backup per location invece di backup completo
- Aumenta frequenza pulizia backup vecchi
- Verifica limiti Storage su Supabase

---

## 🔗 Link Utili

- [Render Scheduled Jobs Documentation](https://render.com/docs/scheduled-jobs)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage REST API](https://supabase.com/docs/reference/javascript/storage-from-upload)

---

**Ultimo aggiornamento:** 2025-01-11  
**Ambiente:** Render Production

