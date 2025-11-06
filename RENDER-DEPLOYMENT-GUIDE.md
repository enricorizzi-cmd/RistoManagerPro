# 🚀 Guida Deployment su Render

## ⚠️ Problema Risolto: Login con Database

Ho migliorato la configurazione per risolvere i problemi di comunicazione con il database su Render.

## 📋 Modifiche Applicate

### 1. **CORS Configurato per Render**

- CORS ora permette tutte le origini in produzione
- Configurato per funzionare con Render che serve frontend e backend dallo stesso dominio

### 2. **Logging Dettagliato**

- Aggiunto logging completo per debug:
  - Ogni richiesta viene loggata
  - Errori di database vengono tracciati
  - Errori di login vengono loggati con dettagli

### 3. **Gestione Errori Migliorata**

- Frontend mostra errori più dettagliati
- Backend restituisce informazioni utili per il debug
- Distinzione tra errori di rete, database e autenticazione

### 4. **Configurazione API**

- Frontend usa automaticamente `window.location.origin` in produzione
- Supporto per variabile d'ambiente `VITE_API_BASE_URL` se necessario

## 🔧 Configurazione Render

### Variabili d'Ambiente Richieste

Nel dashboard di Render, vai su **Environment** e aggiungi:

```
NODE_ENV=production
SUPABASE_URL=https://yuvvqdtyxmdhdamhtszs.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dnZxZHR5eG1kaGRhbWh0c3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzgwMjIsImV4cCI6MjA3Nzk1NDAyMn0.BW0F7tlFJfccZ7DCCtcGR_0jU79vDBaIuYtyQeTzo5E
```

**Nota**: Se hai una chiave Supabase diversa, sostituiscila con quella corretta.

### Build Command

Assicurati che il build command sia:

```bash
npm run build:production
```

### Start Command

Assicurati che lo start command sia:

```bash
npm start
```

Questo avvierà il server Express che serve sia il frontend che l'API.

## 🔍 Debug e Troubleshooting

### Verifica Logs su Render

1. Vai su **Logs** nel dashboard Render
2. Cerca questi log all'avvio:
   ```
   [SUPABASE] Configuration: { url: ..., keyConfigured: true/false }
   RistoManager backend listening on port ...
   Environment: production
   ```

### Test Login

Quando provi a fare login, controlla i log per vedere:

1. **Richiesta ricevuta**:

   ```
   [LOGIN] Attempt for email: ...
   ```

2. **Query database**:

   ```
   [LOGIN] Password hashed, querying database...
   [LOGIN] Database query result: User found / User not found
   ```

3. **Errori possibili**:
   - `[LOGIN] Database error:` - Problema connessione Supabase
   - `[SUPABASE] Error 401:` - Chiave Supabase errata
   - `[SUPABASE] Error 404:` - Tabella non trovata

### Errori Comuni

#### 1. "Database connection failed"

- **Causa**: Variabili d'ambiente Supabase non configurate
- **Soluzione**: Verifica che `SUPABASE_URL` e `SUPABASE_KEY` siano impostate

#### 2. "Failed to fetch" nel browser

- **Causa**: Frontend non riesce a raggiungere il backend
- **Soluzione**:
  - Verifica che il backend sia in esecuzione
  - Controlla che CORS sia configurato correttamente
  - Verifica che l'URL del backend sia corretto

#### 3. "Invalid credentials"

- **Causa**: Utente non esiste o password errata
- **Soluzione**:
  - Verifica che l'utente esista nel database Supabase
  - Controlla i log per vedere se la query trova l'utente

## 📝 Verifica Database Supabase

Assicurati che le seguenti tabelle esistano in Supabase:

- `users` - Utenti dell'applicazione
- `user_sessions` - Sessioni di login
- `locations` - Location/ristoranti
- `user_location_permissions` - Permessi utenti
- `financial_plan_state` - Stato piano finanziario
- `data_entries` - Voci di dati
- `business_plan_drafts` - Bozze business plan
- `financial_stats` - Statistiche finanziarie

## 🧪 Test Locale Prima del Deploy

Prima di deployare su Render, testa localmente:

```bash
# Imposta variabili d'ambiente
export NODE_ENV=production
export SUPABASE_URL=https://yuvvqdtyxmdhdamhtszs.supabase.co
export SUPABASE_KEY=your_key_here

# Build
npm run build:production

# Start
npm start
```

Poi testa il login su `http://localhost:4000`

## ✅ Checklist Pre-Deploy

- [ ] Variabili d'ambiente configurate su Render
- [ ] Build command corretto
- [ ] Start command corretto
- [ ] Database Supabase configurato con tutte le tabelle
- [ ] Almeno un utente creato nel database
- [ ] Logs verificati per errori

## 🆘 Supporto

Se continui ad avere problemi:

1. Controlla i **Logs** su Render per vedere errori specifici
2. Verifica la **Console del Browser** (F12) per errori frontend
3. Verifica che le **variabili d'ambiente** siano configurate correttamente
4. Controlla che il **database Supabase** sia accessibile e contenga i dati necessari

I log ora sono molto più dettagliati e ti diranno esattamente dove si verifica il problema!
