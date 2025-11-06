# RistoManager Pro

Sistema di gestione completo per ristoranti con prenotazioni, tavoli, analisi finanziarie e CRM.

## 📋 Regole Auree per i Calcoli Finanziari

**⚠️ IMPORTANTE:** Prima di modificare qualsiasi calcolo finanziario, leggi le [Regole Auree](./docs/financial-calculation-rules.md).

**In sintesi:**

- **INCASSATO** = sempre il valore aggregato della tipologia 1 (macroId: 1)
- **COSTI FISSI** = sempre il valore aggregato della tipologia 2 (macroId: 2)
- **COSTI VARIABILI** = sempre il valore aggregato della tipologia 3 (macroId: 3)
- **Utile** = Tipologia1 - Tipologia2 - Tipologia3

## 🚀 Avvio Rapido

**Prerequisiti:** Node.js 18+ installato

### 1. Installazione

```bash
# Clona il repository
git clone <repository-url>
cd RistoManagerPro

# Installa le dipendenze del frontend
npm install

# Installa le dipendenze del backend
cd server
npm install
cd ..
```

### 2. Avvio dell'applicazione

```bash
# Avvia frontend + backend automaticamente
npm run dev
```

Questo comando avvierà:

- **Backend** su `http://localhost:4000` (API + Database SQLite)
- **Frontend** su `http://localhost:5173` (interfaccia React)

### 3. Accesso all'applicazione

Apri il browser e vai su: **http://localhost:5173**

## 📁 Struttura del Progetto

```
RistoManagerPro/
├── components/          # Componenti React
├── server/             # Backend Node.js + SQLite
│   ├── data/          # Database SQLite
│   └── index.js       # Server Express
├── services/          # API e servizi
├── hooks/            # Custom React hooks
└── utils/            # Utility functions
```

## 🗄️ Database

L'applicazione usa **SQLite** per la persistenza dei dati:

- **File database:** `server/data/ristomanager.db`
- **Dati salvati:** Piano finanziario, configurazioni, override
- **Backup automatico:** I dati vengono salvati automaticamente ad ogni modifica

## 🔧 Comandi Disponibili

```bash
# Sviluppo (frontend + backend)
npm run dev

# Solo frontend
npm run dev:frontend

# Solo backend
npm run start:backend

# Build per produzione
npm run build

# Test
npm run test

# Linting e formattazione
npm run lint
npm run format
```

## 🐛 Risoluzione Problemi

### Backend non si avvia

```bash
cd server
npm install
npm start
```

### Database non trovato

Il database SQLite viene creato automaticamente al primo avvio del backend.

### Porta già in uso

- Frontend: Cambia la porta in `vite.config.ts`
- Backend: Cambia la porta in `server/index.js` (variabile PORT)

## 📊 Funzionalità

- ✅ **Dashboard** - Panoramica prenotazioni e KPI
- ✅ **Prenotazioni** - Gestione completa prenotazioni
- ✅ **Tavoli** - Layout tavoli drag & drop
- ✅ **Analytics** - Statistiche e grafici
- ✅ **CRM** - Gestione clienti
- ✅ **Piano Finanziario** - Budget e consuntivi
- ✅ **Impostazioni** - Configurazione ristorante

## 🔒 Sicurezza

- Database locale SQLite (nessun cloud)
- CORS configurato per sviluppo locale
- Validazione dati lato server
