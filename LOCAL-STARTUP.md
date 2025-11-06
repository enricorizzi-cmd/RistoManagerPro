# 🚀 RistoManager Pro - Avvio Locale

## ⚠️ IMPORTANTE: Sempre Avvio Locale

**Quando l'utente dice "lancia l'app" significa SEMPRE avvio in locale, NON deployment online!**

## 📋 Procedura Standard

### 1. Verifica Stato Attuale
```bash
# Controlla se ci sono processi Node.js attivi
Get-Process | Where-Object {$_.ProcessName -eq "node"}

# Controlla porte in uso
netstat -ano | findstr ":4000\|:5174"
```

### 2. Avvio Pulito (Raccomandato)
```bash
npm run dev:clean
```

Questo script:
- Pulisce automaticamente le porte 4000 e 5173/5174
- Avvia backend e frontend contemporaneamente
- Usa SQLite locale (NON PostgreSQL online)

### 3. Avvio Manuale (se necessario)
```bash
# Backend
cd server
npm install  # Solo se mancano dipendenze
npm start

# Frontend (in nuovo terminale)
npm run dev:frontend
```

### 4. Verifica Funzionamento
```bash
# Controlla che entrambi i servizi siano attivi
netstat -ano | findstr "LISTENING" | findstr "4000\|5174"
```

Dovresti vedere:
- **Porta 4000**: Backend API (Node.js + Express + SQLite)
- **Porta 5174**: Frontend Vite (React)

## 🌐 Accesso App

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

## 🗄️ Database Locale

- **Tipo**: SQLite
- **Posizione**: `server/data/`
- **File**: `master.db`, `ristomanager_*.db`
- **NON utilizzare**: PostgreSQL online o altri database cloud

## 🔧 Troubleshooting

### Backend non si avvia
```bash
cd server
npm install
npm start
```

### Frontend non si avvia
```bash
npm run dev:frontend
```

### Porte occupate
```bash
npm run dev:clean
# oppure
taskkill /IM node.exe /F
npm run dev
```

### Errori SQLite
- Verifica che `server/data/` esista
- Controlla permessi di scrittura
- NON creare database PostgreSQL

## ❌ Cosa NON Fare

- ❌ NON creare database PostgreSQL online
- ❌ NON deployare su Render/Vercel/Heroku
- ❌ NON configurare variabili d'ambiente cloud
- ❌ NON modificare per deployment online
- ❌ NON usare database esterni

## ✅ Cosa Fare Sempre

- ✅ Usare SQLite locale
- ✅ Avviare con `npm run dev:clean`
- ✅ Verificare porte 4000 e 5174
- ✅ Testare su http://localhost:5174
- ✅ Mantenere tutto locale

## 📝 Note

- L'app è configurata per sviluppo locale
- Database SQLite è sufficiente per testing
- Frontend e backend comunicano via localhost
- Nessuna configurazione cloud necessaria

---

**Ricorda**: "Lancia l'app" = SEMPRE locale, mai online! 🏠








