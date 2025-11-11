# 🔄 Sistema di Backup Automatico - RistoManager Pro

## 📋 Panoramica

Il sistema di backup automatico permette di:

- Creare backup completi del database Supabase
- Eseguire backup automatici programmati
- Gestire e pulire backup vecchi
- Restaurare dati da backup (con cautela)

---

## 🚀 Configurazione Rapida

### 1. Backup Manuale via API

#### Creare un backup completo

```bash
curl -X POST http://localhost:4000/api/backup/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Creare backup di una location specifica

```bash
curl -X POST http://localhost:4000/api/backup/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"locationId": "location-id-123"}'
```

#### Listare tutti i backup

```bash
curl -X GET http://localhost:4000/api/backup/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Backup Automatico con Script

#### Eseguire backup manuale

```bash
# Backup completo
node server/scripts/backup-automatico.cjs

# Backup location specifica
node server/scripts/backup-automatico.cjs location-id-123
```

---

## ⏰ Configurazione Cron Job (Linux/Mac)

### Backup Giornaliero Completo

Aggiungi al crontab (`crontab -e`):

```bash
# Backup completo ogni giorno alle 2:00 AM
0 2 * * * cd /path/to/RistoManagerPro && node server/scripts/backup-automatico.cjs >> /var/log/ristomanager-backup.log 2>&1
```

### Backup Location Specifica ogni 6 ore

```bash
# Backup location ogni 6 ore
0 */6 * * * cd /path/to/RistoManagerPro && node server/scripts/backup-automatico.cjs location-id-123 >> /var/log/ristomanager-backup.log 2>&1
```

### Backup Multipli

```bash
# Backup completo giornaliero alle 2:00 AM
0 2 * * * cd /path/to/RistoManagerPro && node server/scripts/backup-automatico.cjs >> /var/log/ristomanager-backup.log 2>&1

# Backup location 1 ogni 12 ore
0 */12 * * * cd /path/to/RistoManagerPro && node server/scripts/backup-automatico.cjs location-1-id >> /var/log/ristomanager-backup.log 2>&1

# Backup location 2 ogni 12 ore (offset di 6 ore)
30 */12 * * * cd /path/to/RistoManagerPro && node server/scripts/backup-automatico.cjs location-2-id >> /var/log/ristomanager-backup.log 2>&1
```

---

## 🪟 Windows Task Scheduler

### Creare Task per Backup Automatico

1. **Apri Task Scheduler** (Cerca "Task Scheduler" nel menu Start)

2. **Crea Basic Task**
   - Nome: "RistoManager Backup Automatico"
   - Descrizione: "Backup giornaliero database RistoManager Pro"

3. **Trigger**
   - Tipo: Giornaliero
   - Ora: 02:00
   - Ripeti: Ogni giorno

4. **Action**
   - Tipo: Avvia un programma
   - Programma: `node`
   - Argomenti: `server/scripts/backup-automatico.cjs`
   - Directory di avvio: `C:\path\to\RistoManagerPro`

5. **Condizioni**
   - ✅ Avvia il task solo se il computer è collegato all'alimentazione
   - ✅ Svegli il computer per eseguire questo task

6. **Impostazioni**
   - ✅ Consenti l'esecuzione del task su richiesta
   - ✅ Se il task non viene eseguito, riavvialo il più presto possibile

---

## 📁 Struttura Backup

I backup vengono salvati in: `server/backups/`

Formato file: `backup_[locationId]_YYYY-MM-DDTHH-mm-ss.json`

Esempio:

```
server/backups/
  ├── backup_full_2025-01-11T02-00-00.json
  ├── backup_location-1_2025-01-11T08-00-00.json
  └── backup_location-2_2025-01-11T14-00-00.json
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
curl -X POST http://localhost:4000/api/backup/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 30}'
```

### Pulizia Automatica

Lo script `backup-automatico.cjs` pulisce automaticamente i backup vecchi:

```bash
# Mantieni backup per 60 giorni invece di 30
node server/scripts/backup-automatico.cjs "" 60
```

---

## 🔄 Restore da Backup

⚠️ **ATTENZIONE**: Il restore completo non è ancora implementato via API per motivi di sicurezza.

### Opzioni per Restore

1. **Supabase Dashboard** (Raccomandato)
   - Vai a Supabase Dashboard
   - Database → Backups
   - Seleziona backup da ripristinare

2. **Restore Manuale** (Avanzato)
   - Apri il file backup JSON
   - Usa Supabase SQL Editor per inserire i dati
   - ⚠️ Richiede conoscenza SQL avanzata

3. **Via API** (Solo Dry Run)
   ```bash
   curl -X POST http://localhost:4000/api/backup/restore \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "backupPath": "server/backups/backup_full_2025-01-11T02-00-00.json",
       "confirm": true
     }'
   ```

---

## 📊 Monitoraggio

### Verificare Backup Recenti

```bash
# Lista backup via API
curl -X GET http://localhost:4000/api/backup/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verificare Log Backup

```bash
# Linux/Mac
tail -f /var/log/ristomanager-backup.log

# Windows
# Controlla Event Viewer → Windows Logs → Application
```

---

## ⚙️ Configurazione Avanzata

### Variabili d'Ambiente

Il sistema di backup usa le stesse credenziali Supabase del server:

- `SUPABASE_URL` - URL del progetto Supabase
- `SUPABASE_KEY` - Service Role Key (per accesso completo)

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
- I backup contengono dati sensibili - proteggi i file!
- Non committare file di backup nel repository Git

### Best Practices

1. ✅ Esegui backup regolari (almeno giornalieri)
2. ✅ Mantieni backup in location separata (non solo su server)
3. ✅ Testa periodicamente il restore
4. ✅ Monitora lo spazio disco
5. ✅ Cripta backup se contengono dati sensibili

---

## 📝 Checklist Setup

- [ ] Test backup manuale via API
- [ ] Test script backup automatico
- [ ] Configurare cron job / task scheduler
- [ ] Verificare che i backup vengano creati correttamente
- [ ] Configurare pulizia automatica backup vecchi
- [ ] Testare restore (in ambiente di test)
- [ ] Documentare procedure di restore per il team
- [ ] Configurare monitoring/alerting

---

## 🆘 Troubleshooting

### Backup fallisce

1. Verifica credenziali Supabase
2. Verifica spazio disco disponibile
3. Controlla log per errori specifici
4. Verifica permessi directory `server/backups/`

### Backup troppo grandi

- Considera backup per location invece di backup completo
- Aumenta frequenza pulizia backup vecchi
- Comprimi backup dopo la creazione

### Cron job non esegue

1. Verifica path assoluti nello script
2. Verifica permessi esecuzione script
3. Controlla log cron: `grep CRON /var/log/syslog`
4. Testa esecuzione manuale dello script

---

**Ultimo aggiornamento:** 2025-01-11
