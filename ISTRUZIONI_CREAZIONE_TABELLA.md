# Istruzioni per Creare la Tabella menu_dropdown_values in Supabase

## Problema

Gli errori 500 quando si caricano i dropdown (tipologie, categorie, materie prime, fornitori) indicano che la tabella `menu_dropdown_values` non esiste ancora nel database Supabase.

## Soluzione

### Passo 1: Accedi a Supabase Dashboard

1. Vai su https://supabase.com/dashboard
2. Accedi al tuo account
3. Seleziona il progetto RistoManagerPro

### Passo 2: Apri SQL Editor

1. Nel menu laterale, clicca su **"SQL Editor"**
2. Clicca su **"New Query"** (o "Nuova Query")

### Passo 3: Esegui lo Script SQL

1. Copia e incolla il seguente script SQL:

```sql
-- Create menu_dropdown_values table for Supabase
-- This table stores values for tipologie, categorie, materie prime, and fornitori
-- that can be used in dropdowns without creating actual raw material entries

CREATE TABLE IF NOT EXISTS menu_dropdown_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tipologia', 'categoria', 'materia_prima', 'fornitore')),
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, type, value)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_menu_dropdown_values_location_type ON menu_dropdown_values(location_id, type);

-- Add comment to table
COMMENT ON TABLE menu_dropdown_values IS 'Stores dropdown values for menu engineering (tipologie, categorie, materie prime, fornitori)';
```

2. Clicca su **"Run"** (o premi Ctrl+Enter / Cmd+Enter)

### Passo 4: Verifica

1. Dopo l'esecuzione, dovresti vedere un messaggio di successo
2. Ricarica l'applicazione
3. Gli errori 500 dovrebbero scomparire
4. I dropdown dovrebbero funzionare correttamente

## Note

- Lo script usa `CREATE TABLE IF NOT EXISTS`, quindi è sicuro eseguirlo più volte
- La tabella verrà creata automaticamente con tutti gli indici necessari
- Dopo la creazione, potrai salvare nuovi valori usando l'icona della matita nei dropdown

## File di Riferimento

Lo script completo è disponibile in: `server/migrations/create_menu_dropdown_values_SUPABASE.sql`
