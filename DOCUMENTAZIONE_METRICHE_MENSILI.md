# 📊 Documentazione: Inserisci Metriche Mensili

## 📍 Dove vengono salvati i dati

Quando inserisci e salvi le metriche mensili, i dati vengono salvati nel seguente percorso:

### Database

- **Tabella**: `financial_plan_state`
- **Campo**: `data` (JSON)
- **Struttura**: `data.monthlyMetrics[]`

### Struttura dati salvata

```json
{
  "monthlyMetrics": [
    {
      "id": "timestamp",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "year": 2024,
      "month": 12, // 1-based (1=Gennaio, 12=Dicembre)
      "values": {
        "fatturato": 50000.0,
        "saldo-conto": 15000.0,
        "crediti-pendenti": 5000.0,
        "crediti-scaduti": 1000.0,
        "debiti-pendenti": 3000.0,
        "debiti-scaduti": 500.0
      }
    }
  ]
}
```

## 📝 Mappatura Campi → Chiavi di salvataggio

| Campo nel Form                 | Chiave nel Database       | Descrizione                                    |
| ------------------------------ | ------------------------- | ---------------------------------------------- |
| **Fatturato mensile**          | `values.fatturato`        | Fatturato totale del mese                      |
| **Saldo conto fine mese**      | `values.saldo-conto`      | Saldo del conto corrente alla fine del mese    |
| **Crediti pendenti fine mese** | `values.crediti-pendenti` | Crediti ancora da incassare alla fine del mese |
| **Crediti scaduti fine mese**  | `values.crediti-scaduti`  | Crediti scaduti e non ancora incassati         |
| **Debiti pendenti fine mese**  | `values.debiti-pendenti`  | Debiti ancora da pagare alla fine del mese     |
| **Debiti scaduti fine mese**   | `values.debiti-scaduti`   | Debiti scaduti e non ancora pagati             |

## 🔄 Flusso di salvataggio

1. **Input utente**: L'utente inserisce i valori nei campi del form
2. **Conversione**: I valori vengono convertiti da formato italiano (es. "1.234,56") a numero
3. **Creazione entry**: Viene creato un oggetto `MonthlyMetricsSnapshot` con:
   - `id`: Timestamp corrente
   - `createdAt`: Data/ora di creazione
   - `year`: Anno selezionato
   - `month`: Mese selezionato (1-based)
   - `values`: Oggetto con tutte le metriche inserite
4. **Salvataggio**: L'entry viene aggiunta all'array `monthlyMetrics` e salvata in `financial_plan_state.data.monthlyMetrics`
5. **Persistenza**: Il payload completo viene salvato nel database tramite `persistFinancialPlanState()`

## 📂 Percorso completo nel database

```
Supabase Database
└── financial_plan_state (tabella)
    └── id: "financial-plan-{locationId}"
        └── data (JSON)
            └── monthlyMetrics (array)
                └── [entry]
                    ├── id
                    ├── createdAt
                    ├── year
                    ├── month
                    └── values
                        ├── fatturato
                        ├── saldo-conto
                        ├── crediti-pendenti
                        ├── crediti-scaduti
                        ├── debiti-pendenti
                        └── debiti-scaduti
```

## 🔍 Come recuperare i dati

I dati vengono recuperati automaticamente quando:

- Il componente `InserisciDati` viene montato
- Viene caricato lo stato del piano finanziario tramite `fetchFinancialPlanState()`
- I dati vengono passati come prop `monthlyMetrics` al componente

Gli "Ultimi valori" mostrati vengono calcolati cercando l'entry più recente per ogni metrica nell'array `monthlyMetrics`.

## ⚙️ Prossimo mese proposto

Il sistema propone automaticamente il **mese precedente al mese in corso** come mese predefinito per l'inserimento.

**Esempio**: Se siamo a Gennaio 2025, propone Dicembre 2024.
