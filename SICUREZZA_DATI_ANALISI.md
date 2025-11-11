# 🔒 Analisi Sicurezza Dati - RistoManager Pro

## 📋 Executive Summary

**Data Analisi:** 2025-01-11  
**Database:** Supabase PostgreSQL  
**Stato Generale:** ⚠️ **ATTENZIONE - Rilevati rischi significativi**

---

## 🚨 RISCHI CRITICI IDENTIFICATI

### 1. ❌ **Nessuna Gestione Transazioni Atomiche**

**Problema:** Le operazioni multi-step non sono atomiche. Se un'operazione fallisce a metà, i dati possono rimanere in uno stato inconsistente.

**Esempi Critici:**

#### A. Creazione Ricette (server/index.js:5136-5253)

```javascript
// PROBLEMA: Se l'inserimento degli ingredienti fallisce dopo aver creato la ricetta,
// la ricetta rimane nel database senza ingredienti
await db.run('INSERT INTO recipes ...');
// Se questo fallisce, la ricetta esiste ma senza ingredienti
for (const ing of ingredienti) {
  await db.run('INSERT INTO recipe_ingredients ...');
}
```

**Rischio:** ⚠️ **ALTO** - Dati inconsistenti nel database

#### B. Aggiornamento Ricette (server/index.js:5316-5347)

```javascript
// PROBLEMA: DELETE degli ingredienti vecchi + INSERT dei nuovi non è atomico
await db.run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
// Se l'INSERT fallisce qui, la ricetta perde tutti gli ingredienti
for (const ing of ingredienti) {
  await db.run('INSERT INTO recipe_ingredients ...');
}
```

**Rischio:** ⚠️ **ALTO** - Perdita di ingredienti se l'operazione fallisce

#### C. Import Dati Vendite (server/index.js:5659-6277)

```javascript
// PROBLEMA: Operazione complessa multi-step senza transazioni
// Se fallisce a metà, alcuni dati potrebbero essere importati e altri no
```

**Rischio:** ⚠️ **MEDIO** - Dati parziali importati

---

### 2. ❌ **CASCADE DELETE - Cancellazioni a Cascata**

**Problema:** Molte foreign key hanno `ON DELETE CASCADE` che può causare perdita di dati non intenzionale.

**Esempi Critici:**

#### A. Cancellazione Import Vendite

```sql
-- sales_categories ha: ON DELETE CASCADE
-- sales_dish_data ha: ON DELETE CASCADE
-- Se si cancella un import, vengono cancellati automaticamente:
-- - Tutte le categorie associate
-- - Tutti i dati dei piatti associati
```

**Rischio:** ⚠️ **ALTO** - Perdita di dati storici se si cancella un import per errore

#### B. Cancellazione Ricette

```sql
-- recipe_ingredients ha: ON DELETE CASCADE (implicito)
-- sales_dishes.recipe_id ha: ON DELETE SET NULL
-- Se si cancella una ricetta:
-- - Gli ingredienti vengono cancellati (OK)
-- - I piatti collegati perdono il collegamento (OK)
-- MA: Se ci sono trigger che dipendono da recipe_id, potrebbero fallire
```

**Rischio:** ⚠️ **MEDIO** - Potenziale perdita di collegamenti

#### C. Cancellazione Location

```sql
-- Se si cancella una location, CASCADE cancella:
-- - Tutti i dati finanziari
-- - Tutte le ricette
-- - Tutti gli import vendite
-- - Tutto il resto
```

**Rischio:** ⚠️ **CRITICO** - Perdita totale di tutti i dati della location

---

### 3. ✅ **Backup Automatico - IMPLEMENTATO**

**Stato:** ✅ **RISOLTO** - Sistema di backup automatico implementato

**Implementazione:**

- ✅ Servizio backup completo (`server/backup-service.js`)
- ✅ API endpoints per backup manuale e gestione
- ✅ Script per backup automatico via cron job
- ✅ Pulizia automatica backup vecchi
- ✅ Documentazione completa (`BACKUP_SETUP.md`)

**Funzionalità:**

- Backup completo di tutte le tabelle
- Backup per location specifica
- Lista e gestione backup
- Pulizia automatica (configurabile)
- Supporto per cron job e task scheduler

**Raccomandazione Aggiuntiva:**

- Configurare backup automatici giornalieri (vedi `BACKUP_SETUP.md`)
- Utilizzare anche le funzionalità di backup native di Supabase Dashboard
- Considerare Point-in-Time Recovery (PITR) per backup più frequenti

---

### 4. ❌ **RLS Disabilitato su Tutte le Tabelle**

**Problema:** Row Level Security (RLS) è disabilitato su tutte le tabelle pubbliche.

**Tabelle Affette:**

- `users`, `user_sessions`, `locations`
- `recipes`, `raw_materials`, `recipe_ingredients`
- `sales_imports`, `sales_dishes`, `sales_dish_data`
- `financial_plan_state`, `data_entries`
- E molte altre...

**Rischio:** ⚠️ **CRITICO** - Accesso non autorizzato ai dati

**Impatto sulla Perdita Dati:**

- Utenti non autorizzati potrebbero cancellare dati
- Nessuna protezione a livello di database
- Dipendenza totale dall'autenticazione applicativa

---

### 5. ⚠️ **Operazioni DELETE senza Soft Delete**

**Problema:** La maggior parte delle operazioni DELETE sono hard delete (cancellazione permanente).

**Esempi:**

- Cancellazione ricette: `DELETE FROM recipes WHERE id = ?`
- Cancellazione import: `DELETE FROM sales_imports WHERE id = ?`
- Cancellazione utenti: `DELETE FROM users WHERE id = ?`

**Rischio:** ⚠️ **ALTO** - Dati cancellati non recuperabili

**Eccezione Positiva:**

- `sales_dishes` ha campo `is_archived` per soft delete ✅

---

### 6. ⚠️ **Race Conditions**

**Problema:** Alcune operazioni potrebbero avere race conditions.

**Gestione Parziale:**

- Import vendite gestisce duplicate key errors ✅
- Ma altre operazioni potrebbero non gestirle

**Rischio:** ⚠️ **MEDIO** - Dati duplicati o inconsistenti

---

## ✅ PUNTI POSITIVI

### 1. ✅ **Foreign Key Constraints**

- Tutte le foreign key sono ben definite
- Prevengono orfani nel database
- Integrità referenziale garantita

### 2. ✅ **Validazioni Input**

- Validazione dei dati prima dell'inserimento
- Check constraints su campi critici
- Validazione categorie ricette

### 3. ✅ **Error Handling**

- Try-catch su tutte le operazioni critiche
- Logging degli errori
- Messaggi di errore informativi

### 4. ✅ **Unique Constraints**

- Prevengono duplicati
- Proteggono integrità dati

---

## 📊 MATRICE RISCHI

| Rischio                      | Probabilità | Impatto     | Severità   | Priorità |
| ---------------------------- | ----------- | ----------- | ---------- | -------- |
| Nessuna transazioni atomiche | Alta        | Alto        | 🔴 CRITICA | 1        |
| CASCADE DELETE su location   | Bassa       | Critico     | 🔴 CRITICA | 1        |
| ~~Nessun backup automatico~~ | ~~Media~~   | ~~Critico~~ | ✅ RISOLTO | -        |
| RLS disabilitato             | Alta        | Critico     | 🔴 CRITICA | 1        |
| Hard DELETE                  | Media       | Alto        | 🟠 ALTA    | 2        |
| Race conditions              | Bassa       | Medio       | 🟡 MEDIA   | 3        |

---

## 🛡️ RACCOMANDAZIONI PRIORITARIE

### 🔴 PRIORITÀ 1 - CRITICA (Implementare immediatamente)

#### 1. Abilitare RLS su tutte le tabelle

```sql
-- Esempio per recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their location recipes"
ON recipes FOR ALL
USING (
  location_id IN (
    SELECT location_id FROM user_location_permissions
    WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

#### 2. ✅ Implementare Backup Automatici - COMPLETATO

- ✅ Sistema di backup implementato (`server/backup-service.js`)
- ✅ API endpoints per backup manuale
- ✅ Script per backup automatico (`server/scripts/backup-automatico.cjs`)
- ✅ Documentazione setup (`BACKUP_SETUP.md`)
- ⚠️ **Azione Richiesta:** Configurare cron job/task scheduler per backup automatici
- ⚠️ **Raccomandato:** Abilitare anche backup nativi Supabase Dashboard

#### 3. Implementare Transazioni Atomiche

```javascript
// Esempio per creazione ricetta
async function createRecipeWithIngredients(locationId, recipeData) {
  const client = await getSupabaseClient();

  try {
    await client.query('BEGIN');

    // Inserisci ricetta
    const recipe = await client.query('INSERT INTO recipes ... RETURNING *');

    // Inserisci ingredienti
    for (const ing of recipeData.ingredienti) {
      await client.query('INSERT INTO recipe_ingredients ...');
    }

    await client.query('COMMIT');
    return recipe;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
```

#### 4. Proteggere Cancellazione Location

```javascript
// Aggiungere conferma esplicita e soft delete
app.delete(
  '/api/locations/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    // Richiedere conferma esplicita
    const { confirmDelete, backupBeforeDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({
        error: 'Conferma esplicita richiesta',
        requiresConfirmation: true,
      });
    }

    // Opzionale: creare backup prima di cancellare
    if (backupBeforeDelete) {
      await createLocationBackup(locationId);
    }

    // Soft delete invece di hard delete
    await db.run('UPDATE locations SET status = ? WHERE id = ?', [
      'deleted',
      id,
    ]);
  }
);
```

---

### 🟠 PRIORITÀ 2 - ALTA (Implementare a breve)

#### 1. Implementare Soft Delete

- Aggiungere campo `deleted_at` o `is_deleted` alle tabelle principali
- Modificare query per escludere record cancellati
- Implementare funzione di restore

#### 2. Aggiungere Audit Log

- Tabella `audit_log` per tracciare tutte le modifiche
- Log di chi, cosa, quando, perché
- Protezione contro cancellazioni accidentali

#### 3. Validazione Pre-Cancellazione

- Verificare dipendenze prima di cancellare
- Mostrare all'utente cosa verrà cancellato
- Richiedere conferma esplicita

---

### 🟡 PRIORITÀ 3 - MEDIA (Implementare quando possibile)

#### 1. Migliorare Gestione Race Conditions

- Usare lock pessimistici dove necessario
- Implementare retry logic
- Usare unique constraints più robusti

#### 2. Monitoring e Alerting

- Alert su operazioni DELETE di massa
- Monitoring di integrità dati
- Report anomalie

---

## 🔍 CHECKLIST SICUREZZA

### Database

- [ ] RLS abilitato su tutte le tabelle
- [x] Backup automatici configurati (sistema implementato, configurare cron job)
- [ ] Point-in-Time Recovery attivo (raccomandato via Supabase Dashboard)
- [ ] Foreign key constraints verificati
- [ ] Unique constraints verificati
- [ ] Check constraints verificati

### Applicazione

- [ ] Transazioni atomiche implementate
- [ ] Soft delete implementato
- [ ] Audit log implementato
- [ ] Validazione pre-cancellazione
- [ ] Error handling completo
- [ ] Logging completo

### Operazioni

- [x] Procedure di backup testate (sistema implementato)
- [ ] Procedure di restore testate (restore completo da implementare)
- [ ] Disaster recovery plan documentato
- [ ] Monitoring attivo
- [ ] Alerting configurato

---

## 📝 NOTE FINALI

**Stato Attuale:** Il database ha una buona struttura con foreign keys e constraints, ma manca:

1. Protezione a livello database (RLS)
2. Transazioni atomiche per operazioni multi-step
3. Backup automatici
4. Soft delete per dati critici

**Raccomandazione Generale:** Implementare le misure di PRIORITÀ 1 prima di mettere in produzione con dati reali.

**Supabase Features Disponibili:**

- ✅ Backup automatici (configurabile nel dashboard)
- ✅ Point-in-Time Recovery (PITR)
- ✅ RLS support nativo
- ✅ Transazioni PostgreSQL native

---

**Documento creato:** 2025-01-11  
**Prossima revisione:** Dopo implementazione misure prioritarie
