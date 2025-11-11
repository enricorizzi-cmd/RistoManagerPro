# Calcoli Dashboard Vendite

## Valore Totale (totalVendite / totalValue)

**Formula**: `SUM(sales_dish_data.total_value)` per il periodo selezionato

**Dettagli**:

- Somma di tutti i valori in `total_value` dalla tabella `sales_dish_data`
- Filtro per `location_id` e periodo (`period_year`, `period_month`)
- Periodo selezionato:
  - **Mese**: mese precedente (dati caricati il 1° del mese)
  - **Anno**: anno corrente YTD (Year-To-Date)

**Codice backend** (`server/index.js`):

```javascript
// Per periodo selezionato
const salesDataQuery = `
  SELECT
    SUM(sdd.total_value) as total_value,
    SUM(sdd.quantity) as total_quantity
  FROM sales_dish_data sdd
  WHERE sdd.location_id = ?
    AND (
      (sdd.period_year = ? AND sdd.period_month >= ? AND sdd.period_month <= ?)
      OR (sdd.period_year > ? AND sdd.period_year < ?)
      OR (sdd.period_year = ? AND sdd.period_month <= ?)
    )
`;

totalSalesValue = parseFloat(salesPeriodData[0].total_value || 0);
```

---

## Quantità Totale (totalQuantity)

**Formula**: `SUM(sales_dish_data.quantity)` per il periodo selezionato

**Dettagli**:

- Somma di tutte le quantità in `quantity` dalla tabella `sales_dish_data`
- Stesso filtro di periodo del Valore Totale

**Codice backend**:

```javascript
totalSalesQuantity = parseInt(salesPeriodData[0].total_quantity || 0);
```

---

## N. Coperti (coperti) - Sostituisce "Piatti Unici"

**Formula**: `SUM(sales_imports.coperti)` per il periodo selezionato

**Dettagli**:

- Numero totale di coperti per il periodo selezionato
- I coperti vengono rilevati durante l'import Excel dalla voce "Coperto" (esclusa dai piatti)
- Salvati in `sales_imports.coperti` per ogni import mensile

**Codice backend** (`/api/dashboard` e `/api/sales-analysis/dashboard`):

```javascript
const copertiQuery = `
  SELECT SUM(COALESCE(coperti, 0)) as total_coperti
  FROM sales_imports
  WHERE location_id = ?
    AND (
      (period_year = ? AND period_month >= ? AND period_month <= ?)
      OR (period_year > ? AND period_year < ?)
      OR (period_year = ? AND period_month <= ?)
    )
`;
```

**Nota**: Questo KPI sostituisce "Piatti Unici" (uniqueDishes) nel dashboard. Se `coperti = 0`, viene mostrato vuoto (non viene usato fallback).

---

## Ticket Medio (ticketMedio / averageTicket)

**Formula**: `totalValue / coperti`

**Dettagli**:

- Divisione tra Valore Totale e Numero di Coperti
- Se `coperti === 0`, restituisce `0` (mostrato vuoto nell'UI)
- **IMPORTANTE**: Il ticket medio è ora calcolato correttamente usando i coperti invece della quantità totale di piatti

**Codice backend**:

```javascript
// Recupera coperti per il periodo
const copertiPeriod = /* query a sales_imports */;

// Calcola ticket medio
ticketMedio = copertiPeriod > 0 ? totalSalesValue / copertiPeriod : 0;
```

---

## Filtro Periodo

Il periodo viene calcolato in base al filtro selezionato:

### Mese (month)

- **Start**: Primo giorno del mese precedente
- **End**: Ultimo giorno del mese precedente
- **Motivo**: I dati vengono caricati il 1° del mese, quindi si mostra il mese precedente

### Anno (year)

- **Start**: 1 Gennaio dell'anno corrente
- **End**: Ultimo giorno del mese corrente
- **Motivo**: Year-To-Date (YTD) - dall'inizio dell'anno fino ad oggi

---

## Tabelle Database Coinvolte

1. **`sales_dish_data`**: Dati delle vendite per piatto
   - `dish_id`: ID del piatto
   - `total_value`: Valore totale venduto
   - `quantity`: Quantità venduta
   - `period_year`: Anno del periodo
   - `period_month`: Mese del periodo (1-12)
   - `location_id`: ID della location

2. **`sales_dishes`**: Anagrafica piatti
   - `id`: ID piatto
   - `dish_name`: Nome piatto
   - `category_gestionale`: Categoria gestionale

3. **`sales_categories`**: Dati aggregati per categoria
   - `category_name`: Nome categoria
   - `total_value`: Valore totale categoria
   - `total_quantity`: Quantità totale categoria

4. **`sales_imports`**: Registro degli import mensili
   - `id`: ID import
   - `location_id`: ID location
   - `period_year`: Anno del periodo
   - `period_month`: Mese del periodo (1-12)
   - `coperti`: Numero di coperti per questo periodo (NUOVO)
   - `total_dishes`: Numero di piatti importati
   - `total_value`: Valore totale importato
