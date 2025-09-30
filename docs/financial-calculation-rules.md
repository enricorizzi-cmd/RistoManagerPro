# Regole Auree per i Calcoli Finanziari

## REGOLA AUREA #1: Riferimenti alle Tipologie

**QUANDO SI PARLA DI:**
- **INCASSATO** → si intende sempre il **valore aggregato della tipologia 1** (macroId: 1)
- **COSTI FISSI** → si intende sempre il **valore aggregato della tipologia 2** (macroId: 2)  
- **COSTI VARIABILI** → si intende sempre il **valore aggregato della tipologia 3** (macroId: 3)

**NON SI INTENDE MAI:**
- Una singola causale chiamata "Incassato"
- Una singola causale chiamata "Costi Fissi"
- Una singola causale chiamata "Costi Variabili"

## REGOLA AUREA #2: Calcolo dell'Utile

**FORMULA:**
```
Utile = Tipologia1 - Tipologia2 - Tipologia3
```

Dove:
- Tipologia1 = INCASSATO (macroId: 1)
- Tipologia2 = COSTI FISSI (macroId: 2)
- Tipologia3 = COSTI VARIABILI (macroId: 3)

## REGOLA AUREA #3: Incidenza Progressiva

**DEFINIZIONE:**
L'incidenza progressiva misura la percentuale del campo sul valore totale della tipologia INCASSATO.

**FORMULA:**
```
Incidenza = (ValoreCampo / ValoreTotaleTipologia1) * 100
```

**ECCEZIONI:**
- INCASSATO su INCASSATO = sempre 100%
- Altri campi = percentuale basata sui totali annuali

## REGOLA AUREA #4: Ordine di Calcolo

L'ordine di calcolo è determinato dal `macroId`:
1. macroId: 1 (INCASSATO) - valore base
2. macroId: 2 (COSTI FISSI) - sottratto
3. macroId: 3 (COSTI VARIABILI) - sottratto

## IMPLEMENTAZIONE TECNICA

### Funzione Principale
```typescript
calculateUtileFromMacroTotals(
  causaliCatalog: FinancialCausaleGroup[],
  planYear: PlanYearData | undefined,
  getPlanConsuntivoValue: Function,
  year: number,
  monthIndex: number
): number
```

### Logica
1. Ordina le macro per `macroId`
2. Prima macro (macroId: 1) = valore base
3. Macro successive = sottratte dal valore base

## NOTE IMPORTANTI

- **NON** usare mai nomi di causali specifiche nei calcoli
- **SEMPRE** usare i totali aggregati delle tipologie
- **SEMPRE** rispettare l'ordine del `macroId`
- **SEMPRE** documentare eventuali eccezioni a queste regole

## ESEMPI

### ✅ CORRETTO
```typescript
const incassato = getMacroTotal('INCASSATO', year, monthIndex);
const costiFissi = getMacroTotal('COSTI FISSI', year, monthIndex);
const utile = incassato - costiFissi - costiVariabili;
```

### ❌ SBAGLIATO
```typescript
const incassato = getPlanConsuntivoValue('INCASSATO', 'Incassato', 'Incassato', year, monthIndex);
```

---

**Data creazione:** 2024-12-19  
**Versione:** 1.0  
**Autore:** Team RistoManagerPro
