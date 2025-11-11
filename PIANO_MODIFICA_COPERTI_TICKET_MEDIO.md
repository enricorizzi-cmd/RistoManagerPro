# Piano Modifica: Coperti e Ticket Medio Corretto

## 📋 Obiettivo

1. **Rilevare "Coperto" durante l'import** e salvarlo separatamente (non come piatto)
2. **Calcolare Ticket Medio** come `totalValue / coperti` invece di `totalValue / totalQuantity`
3. **Sostituire "Piatti Unici"** con "N. Coperti" nel dashboard

---

## 🗄️ STEP 1: Modifica Database Schema

### 1.1 Aggiungere colonna `coperti` a `sales_imports`

**File**: `server/migrations/create_sales_analysis_tables.sql` (o nuova migration)

**Modifica**:

```sql
-- Aggiungere colonna coperti alla tabella sales_imports
ALTER TABLE sales_imports
ADD COLUMN IF NOT EXISTS coperti INTEGER DEFAULT 0;

-- Commento
COMMENT ON COLUMN sales_imports.coperti IS 'Numero di coperti per questo periodo (escluso dal conteggio piatti)';
```

**Motivazione**: I coperti sono legati all'import mensile, quindi ha senso salvarli in `sales_imports`.

**Alternativa (se serve storico dettagliato)**: Creare tabella `sales_coperti` separata con `period_year`, `period_month`, `location_id`, `coperti`.

---

## 📥 STEP 2: Modifica Import Excel Parser

### 2.1 Rilevare "Coperto" nel parser

**File**: `server/excel-parser.js`

**Modifiche**:

1. In `parseDetailTable()`: aggiungere logica per rilevare righe con nome piatto "Coperto" (case-insensitive, con varianti)
2. Escludere "Coperto" da `detailTable` (non aggiungerlo all'array)
3. Restituire `coperti` come valore separato nel risultato del parsing

**Codice da aggiungere**:

```javascript
// In parseDetailTable()
let coperti = 0;
const detailTable = [];

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const dishName = (row[dishNameCol] || '').toString().trim();

  // Rileva "Coperto" (case-insensitive, con varianti)
  const normalizedDishName = normalizeDishName(dishName);
  if (
    normalizedDishName === 'coperto' ||
    dishName.toLowerCase().includes('coperto') ||
    dishName.toLowerCase() === 'coperti'
  ) {
    // Somma la quantità come coperti (non come piatto)
    const quantity = quantityCol >= 0 ? parseNumericValue(row[quantityCol]) : 0;
    coperti += Math.max(0, Math.round(quantity));
    continue; // NON aggiungere a detailTable
  }

  // ... resto del codice esistente per aggiungere a detailTable
}

return {
  detailTable,
  coperti, // Nuovo campo
  // ... altri campi esistenti
};
```

**Varianti da rilevare**:

- "Coperto"
- "Coperti"
- "Coperto singolo"
- "Coperto doppio"
- "Coperto tavolo"
- Case-insensitive matching

---

### 2.2 Modificare endpoint import per salvare coperti

**File**: `server/index.js` - endpoint `/api/sales-analysis/import`

**Modifiche**:

1. Estrarre `coperti` da `parseResult.coperti`
2. Salvare `coperti` in `sales_imports.coperti` durante la creazione/aggiornamento dell'import

**Codice da modificare**:

```javascript
// Dopo parseExcelFile
const coperti = parseResult.coperti || 0;

// Quando crei/aggiorni sales_imports
await db.run(
  `INSERT INTO sales_imports (
    id, location_id, period_month, period_year, file_name,
    total_categories, total_dishes, total_quantity, total_value,
    coperti, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (location_id, period_month, period_year)
  DO UPDATE SET
    coperti = EXCLUDED.coperti,
    total_categories = EXCLUDED.total_categories,
    total_dishes = EXCLUDED.total_dishes,
    total_quantity = EXCLUDED.total_quantity,
    total_value = EXCLUDED.total_value,
    file_name = EXCLUDED.file_name,
    updated_at = NOW()`,
  [
    importId,
    locationId,
    periodMonth,
    periodYear,
    req.file.originalname,
    parseResult.summaryTable.length,
    parseResult.detailTable.length, // Escluso "Coperto"
    parseResult.detailTable.reduce((sum, d) => sum + d.quantity, 0),
    parseResult.detailTable.reduce((sum, d) => sum + d.totalValue, 0),
    coperti, // NUOVO
    'processing',
  ]
);
```

---

## 🔢 STEP 3: Modifica Calcolo Ticket Medio

### 3.1 Modificare endpoint `/api/dashboard`

**File**: `server/index.js` - endpoint `GET /api/dashboard`

**Modifiche**:

1. Recuperare `coperti` da `sales_imports` per il periodo selezionato
2. Calcolare `ticketMedio = totalSalesValue / coperti` (se `coperti > 0`)
3. Se `coperti === 0`, usare fallback o restituire `0`

**Codice da modificare**:

```javascript
// Dopo aver calcolato totalSalesValue e totalSalesQuantity

// Recupera coperti per il periodo
let copertiPeriod = 0;
try {
  const copertiQuery = `
    SELECT SUM(coperti) as total_coperti
    FROM sales_imports
    WHERE location_id = ?
      AND (
        (period_year = ? AND period_month >= ? AND period_month <= ?)
        OR (period_year > ? AND period_year < ?)
        OR (period_year = ? AND period_month <= ?)
      )
  `;
  const copertiData = await dbQuery(locationId, copertiQuery, [
    locationId,
    startYear,
    startMonth,
    endMonth,
    startYear,
    endYear,
    endYear,
    endMonth,
  ]);

  if (copertiData && copertiData.length > 0) {
    copertiPeriod = parseInt(copertiData[0].total_coperti || 0);
  }
} catch (error) {
  console.error('[Dashboard API] Error fetching coperti:', error);
  // Fallback: usa totalQuantity se coperti non disponibile (per retrocompatibilità)
  copertiPeriod = totalSalesQuantity;
}

// Calcola ticket medio corretto
const ticketMedio = copertiPeriod > 0 ? totalSalesValue / copertiPeriod : 0;
```

---

### 3.2 Modificare endpoint `/api/sales-analysis/dashboard`

**File**: `server/index.js` - endpoint `GET /api/sales-analysis/dashboard`

**Modifiche simili** per calcolare `averageTicket` usando `coperti` invece di `totalQuantity`.

---

## 🎨 STEP 4: Modifica UI Frontend

### 4.1 Sostituire "Piatti Unici" con "N. Coperti"

**File**: `components/sales-analysis/DashboardTab.tsx`

**Modifiche**:

1. Sostituire label "Piatti Unici" con "N. Coperti"
2. Mostrare `dashboardData.kpis.coperti` invece di `uniqueDishes`
3. Aggiornare tipo TypeScript

**Codice**:

```tsx
// Prima
<div className="bg-white rounded-lg shadow p-4">
  <div className="text-sm text-gray-600">Piatti Unici</div>
  <div className="text-2xl font-bold text-gray-900">
    {dashboardData.kpis.uniqueDishes}
  </div>
</div>

// Dopo
<div className="bg-white rounded-lg shadow p-4">
  <div className="text-sm text-gray-600">N. Coperti</div>
  <div className="text-2xl font-bold text-gray-900">
    {dashboardData.kpis.coperti.toLocaleString()}
  </div>
</div>
```

---

### 4.2 Aggiornare tipi TypeScript

**File**: `components/sales-analysis/types.ts`

**Modifiche**:

```typescript
export interface DashboardKPIs {
  totalValue: number;
  totalQuantity: number;
  coperti: number; // Sostituisce uniqueDishes
  averageTicket: number; // Ora calcolato come totalValue / coperti
  linkedDishesCount: number;
  unlinkedDishesCount: number;
  // ... resto
}
```

---

### 4.3 Aggiornare Dashboard principale (se mostra questi valori)

**File**: `components/dashboard/types/dashboard.types.ts`

**Verificare** se `SalesAnalysisData` include `coperti` o se serve aggiungerlo.

---

## 🔌 STEP 5: Aggiornare API Response

### 5.1 Endpoint `/api/dashboard`

**File**: `server/index.js`

**Modifiche**:

```javascript
res.json({
  // ... altri campi
  salesAnalysis: {
    topDishes,
    categoryDistribution,
    ticketMedio: ticketMedio, // Ora calcolato con coperti
    totalVendite: totalSalesValue,
    totalQuantity: totalSalesQuantity,
    coperti: copertiPeriod, // NUOVO
  },
});
```

---

### 5.2 Endpoint `/api/sales-analysis/dashboard`

**File**: `server/index.js`

**Modifiche simili** per restituire `coperti` invece di `uniqueDishes`.

---

## 🔄 STEP 6: Migrazione Dati Esistenti

### 6.1 Script di migrazione (opzionale)

**File**: `server/migrations/migrate_coperti_from_dishes.sql`

**Scopo**: Se ci sono già dati importati con "Coperto" come piatto, estrarli e migrarli.

**Codice**:

```sql
-- Trova tutti i piatti "Coperto" esistenti
-- Estrai la quantità come coperti
-- Aggiorna sales_imports.coperti
-- Elimina i record "Coperto" da sales_dishes e sales_dish_data

-- 1. Aggiorna coperti in sales_imports basandosi su sales_dish_data
UPDATE sales_imports si
SET coperti = COALESCE((
  SELECT SUM(sdd.quantity)
  FROM sales_dish_data sdd
  JOIN sales_dishes sd ON sdd.dish_id = sd.id
  WHERE sdd.import_id = si.id
    AND LOWER(sd.dish_name) LIKE '%coperto%'
), 0);

-- 2. Elimina "Coperto" da sales_dish_data
DELETE FROM sales_dish_data
WHERE dish_id IN (
  SELECT id FROM sales_dishes
  WHERE LOWER(dish_name) LIKE '%coperto%'
);

-- 3. Elimina "Coperto" da sales_dishes
DELETE FROM sales_dishes
WHERE LOWER(dish_name) LIKE '%coperto%';
```

**Nota**: Eseguire solo se necessario, dopo aver testato l'import.

---

## ✅ STEP 7: Testing

### 7.1 Test Import

- [ ] Importare file Excel con "Coperto"
- [ ] Verificare che "Coperto" NON appaia in `sales_dishes`
- [ ] Verificare che `sales_imports.coperti` contenga il valore corretto

### 7.2 Test Calcolo Ticket Medio

- [ ] Verificare che `ticketMedio = totalValue / coperti`
- [ ] Testare con `coperti = 0` (fallback)
- [ ] Verificare che il valore sia ragionevole

### 7.3 Test UI

- [ ] Verificare che "N. Coperti" appaia invece di "Piatti Unici"
- [ ] Verificare che il valore sia corretto
- [ ] Testare con dati esistenti e nuovi

---

## 📝 STEP 8: Documentazione

### 8.1 Aggiornare `CALCOLI_DASHBOARD_VENDITE.md`

Aggiornare la sezione "Ticket Medio" con la nuova formula.

---

## ⚠️ Considerazioni

### Retrocompatibilità

- Se `coperti = 0` per import vecchi, usare `totalQuantity` come fallback
- Mantenere `totalQuantity` nella risposta API per altri usi

### Varianti "Coperto"

- Gestire case-insensitive
- Gestire varianti: "Coperto", "Coperti", "Coperto singolo", ecc.
- Considerare regex per matching più flessibile

### Performance

- Aggiungere indice su `sales_imports(location_id, period_year, period_month)` se non esiste
- Query per coperti deve essere efficiente

---

## 🎯 Ordine di Esecuzione

1. **STEP 1**: Modifica database (migration)
2. **STEP 2**: Modifica parser e import
3. **STEP 3**: Modifica calcolo ticket medio
4. **STEP 4**: Modifica UI frontend
5. **STEP 5**: Aggiornare API response
6. **STEP 6**: Migrazione dati (opzionale, solo se necessario)
7. **STEP 7**: Testing completo
8. **STEP 8**: Documentazione

---

## 🔍 File da Modificare

1. `server/migrations/create_sales_analysis_tables.sql` - Aggiungere colonna `coperti`
2. `server/excel-parser.js` - Rilevare e escludere "Coperto"
3. `server/index.js` - Endpoint import: salvare coperti
4. `server/index.js` - Endpoint `/api/dashboard`: calcolare ticket medio con coperti
5. `server/index.js` - Endpoint `/api/sales-analysis/dashboard`: calcolare ticket medio con coperti
6. `components/sales-analysis/DashboardTab.tsx` - Sostituire "Piatti Unici" con "N. Coperti"
7. `components/sales-analysis/types.ts` - Aggiornare tipi
8. `components/dashboard/types/dashboard.types.ts` - Verificare/aggiornare tipi
9. `CALCOLI_DASHBOARD_VENDITE.md` - Aggiornare documentazione

---

## ⏱️ Stima Tempo

- **Database migration**: 15 min
- **Parser modifiche**: 30 min
- **Backend API modifiche**: 45 min
- **Frontend UI modifiche**: 20 min
- **Testing**: 30 min
- **Documentazione**: 15 min

**Totale**: ~2.5 ore

---

## 🚨 Rischi

1. **Dati esistenti**: Import vecchi potrebbero non avere `coperti` (gestito con fallback)
2. **Varianti "Coperto"**: Potrebbero esserci varianti non previste (testare con dati reali)
3. **Performance**: Query aggiuntiva per coperti (minimale, già indicizzata)

---

## ✅ Checklist Pre-Implementazione

- [ ] Backup database
- [ ] Verificare varianti "Coperto" nei file Excel reali
- [ ] Testare migration su database di test
- [ ] Preparare file Excel di test con "Coperto"
