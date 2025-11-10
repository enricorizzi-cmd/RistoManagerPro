# Campi che Popolano la Panoramica di Piano Finanziario

## Struttura Dati

I valori della Panoramica vengono calcolati da **`consuntivoOverrides`** nel `financial_plan_state`.

### Posizione nel Database
- **Tabella**: `financial_plan_state`
- **Campo**: `consuntivo_overrides` (JSONB)
- **Location**: Identificata da `location_id`

### Struttura di `consuntivoOverrides`

```javascript
consuntivoOverrides[year][monthIndex][macroCategory][category][detail] = value
```

Dove:
- **year** = string (es. "2025", "2024")
- **monthIndex** = string (es. "0" = Gennaio, "1" = Febbraio, ..., "11" = Dicembre)
- **macroCategory** = string (nome della tipologia: "Tipologia1", "Tipologia2", "Tipologia3")
- **category** = string (nome della categoria)
- **detail** = string (nome del dettaglio/item)
- **value** = number (valore numerico)

## Campi Calcolati

### 1. INCASSATO
- **Nome Campo**: `incassato`
- **Posizione**: `consuntivoOverrides[year][monthIndex]["Tipologia1"][category][detail]`
- **Logica**: Somma di tutti i valori dove `macroId === 1` nel `causaliCatalog`
- **Formula**: Somma per ogni mese YTD (Year To Date) di tutti gli item con `macroId: 1`

### 2. COSTI FISSI
- **Nome Campo**: `costiFissi`
- **Posizione**: `consuntivoOverrides[year][monthIndex]["Tipologia2"][category][detail]`
- **Logica**: Somma di tutti i valori dove `macroId === 2` nel `causaliCatalog`
- **Formula**: Somma per ogni mese YTD di tutti gli item con `macroId: 2`

### 3. COSTI VARIABILI
- **Nome Campo**: `costiVariabili`
- **Posizione**: `consuntivoOverrides[year][monthIndex]["Tipologia3"][category][detail]`
- **Logica**: Somma di tutti i valori dove `macroId === 3` nel `causaliCatalog`
- **Formula**: Somma per ogni mese YTD di tutti gli item con `macroId: 3`

### 4. UTILE
- **Nome Campo**: `utile`
- **Posizione**: **CALCOLATO** (non memorizzato direttamente)
- **Logica**: `utile = incassato - costiFissi - costiVariabili`
- **Formula**: Differenza tra Incassato e la somma di Costi Fissi + Costi Variabili

### 5. FATTURATO
- **Nome Campo**: `fatturato`
- **Posizione**: `financial_stats.fatturato_imponibile` (tabella `financial_stats`)
- **Logica**: Valore dalla tabella `financial_stats` per il mese/anno corrispondente
- **Formula**: Somma YTD di `fatturato_imponibile` dalla tabella `financial_stats`

## Esempio di Percorso Completo

Per ottenere il valore di un singolo item di Incassato per Gennaio 2025:

```
consuntivoOverrides["2025"]["0"]["Tipologia1"]["NomeCategoria"]["NomeItem"] = 1000
```

Dove:
- `"2025"` = anno
- `"0"` = Gennaio (monthIndex 0-based)
- `"Tipologia1"` = macroCategory per Incassato
- `"NomeCategoria"` = nome della categoria (es. "Vendite")
- `"NomeItem"` = nome dell'item (es. "Vendite al banco")
- `1000` = valore numerico

## Calcolo YTD (Year To Date)

Per l'anno corrente, la Panoramica mostra i valori YTD:
- **Mesi inclusi**: Da Gennaio (0) fino al mese precedente al corrente
- **Esempio**: Se siamo a Novembre 2025 (monthIndex = 10), YTD include mesi 0-9 (Gennaio-Ottobre)

## Causali Catalog

Il `causaliCatalog` definisce la struttura delle causali:
- **macroId: 1** → Incassato (Tipologia1)
- **macroId: 2** → Costi Fissi (Tipologia2)
- **macroId: 3** → Costi Variabili (Tipologia3)

Ogni gruppo contiene:
- `macroCategory`: nome della tipologia
- `categories[]`: array di categorie
- `categories[].items[]`: array di dettagli/item

## Verifica nel Codice

Le funzioni di calcolo si trovano in:
- `utils/financialCalculations.ts`:
  - `getIncassatoTotal()` - riga 189
  - `getCostiFissiTotal()` - riga 215
  - `getCostiVariabiliTotal()` - riga 239
  - `calculateUtileFromMacroTotals()` - riga 263

Il componente che mostra la Panoramica:
- `components/financial/FinancialOverview.tsx` - riga 73-330

