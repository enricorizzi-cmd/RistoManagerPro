# 🚀 Guida Avvio Server RistoManager Pro

## ⚠️ Problema Comune: Conflitto di Porte

### Sintomi:
- Errore: `Error: listen EADDRINUSE: address already in use :::4000`
- I dati non si salvano quando cambi scheda
- Il backend non si avvia

### Causa:
Processi precedenti rimangono attivi sulle porte 4000 (backend) o 5173/5174 (frontend).

## ✅ Soluzioni

### 1. Avvio Pulito (Raccomandato)
```bash
npm run dev:clean
```
Questo script pulisce automaticamente le porte prima di avviare.

### 2. Pulizia Manuale
```powershell
# Trova processi sulla porta 4000
netstat -ano | findstr :4000

# Termina il processo (sostituisci PID)
taskkill /PID <PID_NUMBER> /F

# Avvia normalmente
npm run dev
```

### 3. Pulizia Completa
```powershell
# Termina tutti i processi Node.js
taskkill /IM node.exe /F

# Poi avvia
npm run dev
```

## 🔧 Script Disponibili

- `npm run dev` - Avvio normale (può fallire se porte occupate)
- `npm run dev:clean` - Avvio con pulizia automatica porte
- `npm run dev:frontend` - Solo frontend
- `npm run start:backend` - Solo backend

## 📋 Verifica Server Attivi

```powershell
# Controlla che entrambi i server siano attivi
netstat -ano | findstr ":4000\|:5174"
```

Dovresti vedere:
- Porta 4000: Backend API
- Porta 5174: Frontend Vite

## 🎯 Test Funzionalità

1. Vai su http://localhost:5174
2. Naviga a Piano Finanziario → Inserisci Dati
3. Inserisci un dato e clicca "Salva riga"
4. Cambia scheda e torna indietro
5. Il dato dovrebbe essere ancora presente nel piano mensile

## 🚨 Se il Problema Persiste

1. Riavvia completamente il computer
2. Verifica che non ci siano altri progetti Node.js in esecuzione
3. Controlla il Task Manager per processi node.exe
