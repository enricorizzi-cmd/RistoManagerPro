# RistoManager Pro - Analisi di Sicurezza, Performance e Qualità

Questo documento descrive le analisi automatiche configurate per il progetto RistoManager Pro.

## 🚀 Analisi Rapide

### Comandi NPM Disponibili

```bash
# Sicurezza
npm run audit              # Controllo vulnerabilità NPM
npm run audit:fix          # Fix automatico vulnerabilità
npm run security:check     # Controllo completo sicurezza

# Qualità Codice
npm run lint               # Controllo ESLint
npm run lint:fix           # Fix automatico ESLint
npm run format             # Formattazione Prettier
npm run format:check       # Verifica formattazione
npm run type-check         # Controllo TypeScript

# Performance
npm run bundle:analyze     # Analisi dimensioni bundle
npm run lighthouse         # Audit Lighthouse

# Testing
npm run test               # Esegui test
npm run test:coverage      # Test con coverage

# Analisi Completa
npm run quality:check      # Controllo qualità completo
npm run analyze:all        # Tutte le analisi
```

## 📊 Script di Analisi

### Windows
```bash
# Analisi completa
scripts\full-analysis.bat

# Analisi specifiche
scripts\security-scan.bat
scripts\quality-scan.bat
scripts\performance-scan.bat
```

### Linux/Mac
```bash
# Analisi completa
./scripts/full-analysis.sh

# Analisi specifiche
./scripts/security-scan.sh
./scripts/quality-scan.sh
./scripts/performance-scan.sh
```

## 🔒 Analisi di Sicurezza

### 1. NPM Audit
- **Scopo**: Rileva vulnerabilità nelle dipendenze
- **Frequenza**: Ad ogni install/update
- **Comando**: `npm run audit`

### 2. Dependency Check
- **Scopo**: Analisi approfondita dipendenze
- **Frequenza**: Settimanale
- **Comando**: `npm run security:deps`

### 3. License Check
- **Scopo**: Verifica licenze compatibili
- **Frequenza**: Mensile
- **Comando**: `npx license-checker`

## ⚡ Analisi di Performance

### 1. Bundle Analysis
- **Scopo**: Ottimizzazione dimensioni bundle
- **Frequenza**: Ad ogni build
- **Comando**: `npm run bundle:analyze`

### 2. Lighthouse Audit
- **Scopo**: Core Web Vitals e performance
- **Frequenza**: Settimanale
- **Comando**: `npm run lighthouse`

### 3. Memory Usage
- **Scopo**: Rilevamento memory leak
- **Frequenza**: Durante sviluppo
- **Comando**: Incluso in performance-scan

## 🎯 Analisi di Qualità

### 1. ESLint
- **Scopo**: Qualità codice e best practices
- **Frequenza**: Ad ogni commit
- **Comando**: `npm run lint`

### 2. TypeScript
- **Scopo**: Type safety
- **Frequenza**: Ad ogni build
- **Comando**: `npm run type-check`

### 3. Prettier
- **Scopo**: Formattazione consistente
- **Frequenza**: Ad ogni commit
- **Comando**: `npm run format:check`

### 4. Test Coverage
- **Scopo**: Copertura test
- **Frequenza**: Ad ogni PR
- **Comando**: `npm run test:coverage`

## 🔄 CI/CD Pipeline

### GitHub Actions
Il file `.github/workflows/quality-check.yml` include:

1. **Security Check**: Audit dipendenze
2. **Quality Check**: Lint, type-check, test
3. **Performance Check**: Bundle analysis

### Pre-commit Hooks (Raccomandato)
```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npm run quality:check"
```

## 📈 Metriche e Soglie

### Sicurezza
- **Vulnerabilità**: 0 critiche, max 5 moderate
- **Dipendenze**: Aggiornamento mensile
- **Licenze**: Solo MIT, Apache, BSD

### Performance
- **Bundle Size**: < 1MB gzipped
- **Lighthouse**: > 90 performance
- **Core Web Vitals**: Tutti verdi

### Qualità
- **ESLint**: 0 errori, max 10 warnings
- **TypeScript**: 0 errori
- **Test Coverage**: > 80%
- **Code Complexity**: < 10 per funzione

## 🛠️ Risoluzione Problemi

### Vulnerabilità NPM
```bash
npm audit fix
npm update
```

### Errori ESLint
```bash
npm run lint:fix
```

### Problemi TypeScript
```bash
npm run type-check
# Correggere errori manualmente
```

### Bundle Size Elevato
```bash
npm run bundle:analyze
# Identificare e rimuovere dipendenze non necessarie
```

## 📅 Pianificazione Analisi

### Giornaliera
- ESLint su commit
- TypeScript su build

### Settimanale
- Security audit completo
- Lighthouse performance
- Test coverage

### Mensile
- Aggiornamento dipendenze
- License check
- Analisi completa

## 📋 Report e Documentazione

I report vengono salvati in:
- `reports/` - Report individuali
- `reports/full_analysis_YYYYMMDD_HHMMSS/` - Analisi complete
- `coverage/` - Report coverage test

Ogni analisi completa genera un `SUMMARY.md` con:
- Overview risultati
- Comandi per fix
- Prossimi passi
- Metriche chiave
