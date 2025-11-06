# 📊 Analisi Storage Locale vs Supabase

## ✅ ACCETTABILE: localStorage per Auth Token

**File:** `contexts/AuthContext.tsx`, `hooks/useBusinessPlan.ts`, `services/financialPlanApi.ts`

**Uso:** Solo per salvare il token di autenticazione (`auth_token`)
- ✅ **ACCETTABILE** - Il token è necessario per mantenere la sessione utente
- Non contiene dati dell'applicazione
- Viene rimosso al logout

## ❌ PROBLEMA CRITICO: Server usa SQLite locale

**File:** `server/index.js`

**Problema:** Il server Express usa ancora SQLite locale invece di Supabase:

### Database SQLite attualmente usati:
1. `master.db` - Locations, Users, Sessions, Permissions
2. `ristomanager_{locationId}.db` - Financial Plan State, Data Entries, Business Plan Drafts, Financial Stats

### Endpoint che salvano su SQLite locale:
- `/api/financial-plan/state` - Salva su `financial_plan_state` (SQLite)
- `/api/data-entries/:locationId` - Salva su `data_entries` (SQLite)
- `/api/business-plan/drafts` - Salva su `business_plan_drafts` (SQLite)
- `/api/financial-stats` - Salva su `financial_stats` (SQLite)
- `/api/auth/*` - Salva su `master.db` (SQLite)
- `/api/user/*` - Legge da `master.db` (SQLite)
- `/api/locations/*` - Legge/Scrive su `master.db` (SQLite)

## ✅ ACCETTABILE: Script di migrazione

**File:** `server/migrate-to-supabase.cjs`, `scripts/migrate_stats.cjs`, ecc.

**Uso:** Solo per migrare dati da SQLite a Supabase
- ✅ **ACCETTABILE** - Script temporanei per migrazione
- Non vengono eseguiti in produzione

## ✅ ACCETTABILE: File di test

**File:** `src/test/App.test.tsx`

**Uso:** Mock localStorage per test
- ✅ **ACCETTABILE** - Solo per testing

## 📋 PIANO DI MIGRAZIONE

### 1. Migrare server/index.js a Supabase
- Rimuovere dipendenza `sqlite3`
- Aggiungere chiamate API a Supabase REST API
- Mantenere stessa struttura endpoint per compatibilità frontend

### 2. Verificare che frontend non usi storage locale
- ✅ Già verificato: frontend chiama solo API backend
- ✅ localStorage usato solo per auth_token (accettabile)

### 3. Rimuovere file SQLite
- Rimuovere `server/data/*.db` dopo migrazione completa
- Aggiungere `.gitignore` per file `.db`

## 🔧 CONFIGURAZIONE SUPABASE NECESSARIA

Il server deve usare:
- **SUPABASE_URL**: `https://yuvvqdtyxmdhdamhtszs.supabase.co`
- **SUPABASE_KEY**: (anon key per operazioni pubbliche, service role key per operazioni admin)

## ⚠️ NOTE IMPORTANTI

1. **localStorage per auth_token è ACCETTABILE** - È necessario per mantenere la sessione
2. **Tutti i dati dell'applicazione devono andare su Supabase** - Attualmente vanno su SQLite locale
3. **Il server deve essere completamente migrato** - Nessun dato deve essere salvato localmente

