# 📊 PROGETTAZIONE COMPLETA E DETTAGLIATA: ANALISI VENDITE

## 🎯 OBIETTIVO STRATEGICO

Creare un sistema completo di Analisi Vendite che integri dati dal gestionale di fatturazione, permetta il matching intelligente piatti-ricette, e fornisca dashboard avanzate per decisioni data-driven nel settore ristorazione.

---

## 📋 ANALISI APPROFONDITA DEL FILE EXCEL

### Struttura File "dati Ipratico.xlt"

**IMPORTANTE:** Il file .xlt è un template Excel legacy. Deve essere convertito in .xlsx o analizzato manualmente. Struttura attesa basata su descrizione:

#### TABELLA 1: RIEPILOGO PER CATEGORIA PIATTO

**Posizione:** Primo foglio o prima sezione del foglio principale
**Struttura attesa:**

```
| Categoria Gestionale | Quantità Venduta | Valore Totale (€) |
|---------------------|------------------|-------------------|
| Antipasti           | 150              | 1,250.00          |
| Primi               | 320              | 2,880.00          |
| Secondi              | 280              | 4,200.00          |
| Dessert              | 120              | 600.00            |
| Bevande              | 450              | 1,350.00          |
```

**Note critiche:**

- Le categorie sono del GESTIONALE, non dell'app
- Potrebbero esserci categorie non standard (es: "Contorni", "Pizze", "Specialità")
- Totale righe variabile (5-15 categorie tipicamente)

#### TABELLA 2: DETTAGLIO ANALITICO PIATTI

**Posizione:** Secondo foglio o seconda sezione del foglio principale
**Struttura attesa:**

```
| Nome Piatto                    | Categoria Gestionale | Quantità | Valore Totale (€) | Prezzo Unitario (€) |
|-------------------------------|---------------------|----------|-------------------|---------------------|
| Bruschetta al Pomodoro         | Antipasti           | 45       | 225.00           | 5.00                |
| Spaghetti Carbonara            | Primi               | 120      | 1,080.00         | 9.00                |
| Filetto di Manzo               | Secondi             | 85       | 1,700.00         | 20.00               |
```

**Note critiche:**

- Nomi piatti possono avere variazioni (maiuscole/minuscole, accenti, spazi)
- Prezzo unitario potrebbe essere calcolato o presente
- Numero righe variabile (50-500+ piatti)
- Potrebbero esserci righe vuote o totali intermedi

### ALGORITMO DI PARSING EXCEL

#### Fase 1: Identificazione Tabelle

```typescript
interface ExcelParseResult {
  summaryTable: CategorySummary[];
  detailTable: DishDetail[];
  metadata: {
    fileName: string;
    fileSize: number;
    lastModified: Date;
    sheetNames: string[];
    detectedFormat: 'xls' | 'xlsx' | 'xlt';
  };
}

// Algoritmo di rilevamento:
// 1. Cerca intestazioni comuni: "Categoria", "Nome", "Quantità", "Valore"
// 2. Identifica righe header (prima riga con tutte le colonne popolate)
// 3. Distingui tabella riepilogativa (poche righe, solo categorie) da analitica (molte righe, nomi piatti)
// 4. Gestisci casi edge: righe vuote, totali intermedi, formattazione
```

#### Fase 2: Normalizzazione Dati

```typescript
function normalizeDishName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD') // Rimuove accenti
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '') // Rimuove caratteri speciali
    .replace(/\s+/g, ' '); // Normalizza spazi
}

function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Rimuovi simboli €, punti migliaia, sostituisci virgola decimale
    const cleaned = value
      .replace(/[€\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}
```

---

## 🗄️ SCHEMA DATABASE DETTAGLIATO

### TABELLA 1: sales_imports

**Scopo:** Traccia ogni importazione mensile

```sql
CREATE TABLE sales_imports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location_id TEXT NOT NULL REFERENCES locations(id),
  import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020 AND period_year <= 2100),
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_hash TEXT, -- SHA256 per deduplicazione
  total_categories INTEGER DEFAULT 0,
  total_dishes INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  total_value NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'failed', 'processing')),
  error_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  notes TEXT, -- JSON con dettagli errori/warning
  imported_by TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, period_month, period_year)
);

-- Indici
CREATE INDEX idx_sales_imports_location_period ON sales_imports(location_id, period_year DESC, period_month DESC);
CREATE INDEX idx_sales_imports_date ON sales_imports(import_date DESC);
CREATE INDEX idx_sales_imports_status ON sales_imports(status) WHERE status != 'completed';
CREATE INDEX idx_sales_imports_hash ON sales_imports(file_hash) WHERE file_hash IS NOT NULL;
```

**Validazioni Business Logic:**

- Non può esistere più di un import "completed" per stesso periodo/location
- Se esiste import "failed", può essere sovrascritto
- `file_hash` previene import duplicati accidentali

### TABELLA 2: sales_categories

**Scopo:** Dati aggregati per categoria gestionale

```sql
CREATE TABLE sales_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location_id TEXT NOT NULL REFERENCES locations(id),
  import_id TEXT NOT NULL REFERENCES sales_imports(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  category_name_normalized TEXT NOT NULL, -- Per matching futuro
  quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
  total_value NUMERIC(10, 2) DEFAULT 0 CHECK (total_value >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(import_id, category_name_normalized)
);

CREATE INDEX idx_sales_categories_import ON sales_categories(import_id);
CREATE INDEX idx_sales_categories_location ON sales_categories(location_id);
CREATE INDEX idx_sales_categories_name ON sales_categories(location_id, category_name_normalized);
```

### TABELLA 3: sales_dishes (MASTER LIST)

**Scopo:** Catalogo univoco di tutti i piatti importati

```sql
CREATE TABLE sales_dishes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location_id TEXT NOT NULL REFERENCES locations(id),
  dish_name TEXT NOT NULL, -- Nome normalizzato per matching
  dish_name_original TEXT NOT NULL, -- Nome originale dal primo import
  dish_name_variants TEXT[], -- Array di varianti trovate negli import
  category_gestionale TEXT, -- Categoria più frequente nel gestionale
  recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  is_linked BOOLEAN DEFAULT FALSE,
  match_confidence NUMERIC(3, 2) CHECK (match_confidence >= 0 AND match_confidence <= 1), -- 0-1 per match automatico
  match_method TEXT CHECK (match_method IN ('exact', 'fuzzy', 'manual', 'suggested', NULL)),
  first_seen_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_imports INTEGER DEFAULT 1 CHECK (total_imports > 0),
  total_quantity_sold INTEGER DEFAULT 0,
  total_value_generated NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, dish_name)
);

-- Indici
CREATE INDEX idx_sales_dishes_location ON sales_dishes(location_id);
CREATE INDEX idx_sales_dishes_recipe ON sales_dishes(recipe_id) WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_sales_dishes_linked ON sales_dishes(location_id, is_linked);
CREATE INDEX idx_sales_dishes_category ON sales_dishes(location_id, category_gestionale);
CREATE INDEX idx_sales_dishes_name_search ON sales_dishes USING gin(to_tsvector('italian', dish_name));
CREATE INDEX idx_sales_dishes_unlinked ON sales_dishes(location_id) WHERE is_linked = FALSE;
```

**Logica Aggiornamento:**

- `dish_name_variants`: quando stesso piatto appare con nome leggermente diverso, aggiungi variante
- `category_gestionale`: usa categoria più frequente tra tutti gli import
- `match_confidence`: 1.0 = match esatto, 0.8-0.99 = fuzzy, <0.8 = manuale

### TABELLA 4: sales_dish_data

**Scopo:** Dati vendita per piatto per periodo

```sql
CREATE TABLE sales_dish_data (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location_id TEXT NOT NULL REFERENCES locations(id),
  import_id TEXT NOT NULL REFERENCES sales_imports(id) ON DELETE CASCADE,
  dish_id TEXT NOT NULL REFERENCES sales_dishes(id) ON DELETE CASCADE,
  recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL, -- Denormalizzato per performance
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  total_value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_value >= 0),
  unit_price NUMERIC(10, 2) GENERATED ALWAYS AS (
    CASE WHEN quantity > 0 THEN ROUND(total_value / quantity, 2) ELSE 0 END
  ) STORED,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(import_id, dish_id)
);

-- Indici critici per performance
CREATE INDEX idx_sales_dish_data_import ON sales_dish_data(import_id);
CREATE INDEX idx_sales_dish_data_dish ON sales_dish_data(dish_id);
CREATE INDEX idx_sales_dish_data_recipe ON sales_dish_data(recipe_id) WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_sales_dish_data_period ON sales_dish_data(location_id, period_year DESC, period_month DESC);
CREATE INDEX idx_sales_dish_data_location_period ON sales_dish_data(location_id, period_year, period_month);
CREATE INDEX idx_sales_dish_data_value_desc ON sales_dish_data(location_id, period_year, period_month, total_value DESC);
```

### TRIGGER E FUNZIONI

#### Trigger 1: Aggiorna recipe_sales su collegamento

```sql
CREATE OR REPLACE FUNCTION sync_recipe_sales_on_link()
RETURNS TRIGGER AS $$
DECLARE
  sales_record RECORD;
BEGIN
  -- Solo se collegamento appena creato o modificato
  IF NEW.recipe_id IS NOT NULL AND (OLD.recipe_id IS NULL OR OLD.recipe_id != NEW.recipe_id) THEN
    -- Inserisci/aggiorna tutti i dati storici del piatto
    FOR sales_record IN
      SELECT * FROM sales_dish_data WHERE dish_id = NEW.id
    LOOP
      INSERT INTO recipe_sales (id, location_id, recipe_id, quantity, sale_date)
      VALUES (
        gen_random_uuid()::text,
        sales_record.location_id,
        NEW.recipe_id,
        sales_record.quantity,
        MAKE_DATE(sales_record.period_year, sales_record.period_month, 1)
      )
      ON CONFLICT DO NOTHING; -- Evita duplicati

      -- Aggiorna recipe_id denormalizzato
      UPDATE sales_dish_data
      SET recipe_id = NEW.recipe_id
      WHERE id = sales_record.id AND recipe_id IS DISTINCT FROM NEW.recipe_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_recipe_sales_on_link
  AFTER UPDATE OF recipe_id ON sales_dishes
  FOR EACH ROW
  WHEN (NEW.recipe_id IS DISTINCT FROM OLD.recipe_id)
  EXECUTE FUNCTION sync_recipe_sales_on_link();
```

#### Trigger 2: Aggiorna statistiche sales_dishes

```sql
CREATE OR REPLACE FUNCTION update_sales_dishes_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sales_dishes
  SET
    last_seen_date = NOW(),
    total_imports = total_imports + 1,
    total_quantity_sold = total_quantity_sold + NEW.quantity,
    total_value_generated = total_value_generated + NEW.total_value,
    updated_at = NOW()
  WHERE id = NEW.dish_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_dishes_stats
  AFTER INSERT ON sales_dish_data
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_dishes_stats();
```

---

## 🔄 FLUSSO DI IMPORT DETTAGLIATO

### STEP 1: Upload e Validazione File

**Frontend:**

```typescript
interface FileUploadState {
  file: File | null;
  preview: {
    fileName: string;
    fileSize: number;
    lastModified: Date;
    isValid: boolean;
    errors: string[];
  };
  isUploading: boolean;
  uploadProgress: number;
}

// Validazioni:
// 1. Formato: .xls, .xlsx, .xlt (convertire .xlt)
// 2. Dimensione: max 10MB
// 3. Nome file: non vuoto
// 4. Tipo MIME: application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

**Backend Endpoint:**

```
POST /api/sales-analysis/upload-preview
Content-Type: multipart/form-data
Body: { file: File }

Response: {
  preview: {
    fileName: string;
    fileSize: number;
    detectedSheets: string[];
    estimatedRows: number;
    sampleData: {
      summaryTable: CategorySummary[];
      detailTable: DishDetail[];
    };
  };
  validation: {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  };
}
```

### STEP 2: Selezione Periodo

**UI Component:**

```typescript
interface PeriodSelectorProps {
  onPeriodSelect: (period: { month: number; year: number }) => void;
  existingImports: SalesImport[]; // Per mostrare conflitti
  defaultPeriod?: { month: number; year: number };
}

// Validazioni:
// 1. Mese: 1-12
// 2. Anno: >= 2020, <= anno corrente + 1 (per previsioni)
// 3. Periodo futuro: warning ma permesso
// 4. Periodo già importato: mostra modal conferma sovrascrittura
```

**Conflitto Periodo Esistente:**

```typescript
interface ImportConflict {
  existingImport: SalesImport;
  conflictType: 'exact' | 'overlap'; // exact = stesso periodo, overlap = mesi adiacenti
  action: 'overwrite' | 'cancel' | 'rename'; // rename = crea nuovo con suffisso
}
```

### STEP 3: Parsing Excel Avanzato

**Algoritmo di Rilevamento Tabelle:**

```typescript
function detectTables(workbook: Workbook): TableDetectionResult {
  // 1. Analizza tutti i fogli
  // 2. Per ogni foglio, cerca pattern:
  //    - Tabella riepilogativa: poche righe (<20), colonne "Categoria", "Quantità", "Valore"
  //    - Tabella analitica: molte righe (>20), colonne "Nome", "Piatto", "Quantità", "Valore"
  // 3. Gestisci casi edge:
  //    - Intestazioni su più righe
  //    - Righe vuote intermedie
  //    - Totali intermedi
  //    - Formattazione condizionale che nasconde dati
  // 4. Estrai dati con validazione tipo
  // 5. Calcola statistiche di qualità dati
}
```

**Gestione Errori Parsing:**

```typescript
interface ParseError {
  type: 'missing_column' | 'invalid_data' | 'empty_row' | 'type_mismatch';
  row: number;
  column: string;
  value: any;
  expected: string;
  severity: 'error' | 'warning';
  autoFix?: {
    suggestedValue: any;
    confidence: number;
  };
}
```

### STEP 4: Normalizzazione e Matching

**Normalizzazione Nome Piatto:**

```typescript
function normalizeDishName(name: string): NormalizedName {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuovi accenti
    .replace(/[^\w\s]/g, '') // Rimuovi caratteri speciali
    .replace(/\s+/g, ' '); // Normalizza spazi

  // Rimuovi articoli comuni
  const articles = [
    'il',
    'la',
    'lo',
    'gli',
    'le',
    'un',
    'una',
    'uno',
    'dei',
    'delle',
  ];
  const words = normalized.split(' ');
  const filtered = words.filter(w => !articles.includes(w));

  return {
    normalized: filtered.join(' '),
    original: name,
    variants: generateVariants(name), // "Pasta al pomodoro" -> ["pasta pomodoro", "pasta al pomodoro"]
    keywords: extractKeywords(filtered), // ["pasta", "pomodoro"]
  };
}
```

**Algoritmo Matching Automatico:**

```typescript
interface MatchingResult {
  dish: SalesDish;
  recipe: Recipe | null;
  confidence: number; // 0-1
  method: 'exact' | 'fuzzy' | 'keyword' | 'manual' | null;
  reasons: string[]; // Perché questo match
}

function matchDishToRecipe(
  dish: NormalizedDish,
  recipes: Recipe[],
  existingLinks: Map<string, string> // dish_id -> recipe_id
): MatchingResult {
  // 1. Controlla se piatto già esiste in sales_dishes con recipe_id
  const existingDish = findExistingDish(dish.normalized);
  if (existingDish?.recipe_id) {
    return {
      dish: existingDish,
      recipe: findRecipe(existingDish.recipe_id),
      confidence: 1.0,
      method: 'existing',
      reasons: ['Piatto già collegato in import precedente'],
    };
  }

  // 2. Match esatto (nome normalizzato)
  const exactMatch = recipes.find(
    r => normalizeDishName(r.nome_piatto).normalized === dish.normalized
  );
  if (exactMatch) {
    return {
      dish: existingDish || createNewDish(dish),
      recipe: exactMatch,
      confidence: 1.0,
      method: 'exact',
      reasons: ['Nome identico dopo normalizzazione'],
    };
  }

  // 3. Match fuzzy (Levenshtein distance)
  const fuzzyMatches = recipes
    .map(r => ({
      recipe: r,
      distance: levenshteinDistance(
        dish.normalized,
        normalizeDishName(r.nome_piatto).normalized
      ),
      similarity: calculateSimilarity(
        dish.normalized,
        normalizeDishName(r.nome_piatto).normalized
      ),
    }))
    .filter(m => m.similarity > 0.8)
    .sort((a, b) => b.similarity - a.similarity);

  if (fuzzyMatches.length > 0) {
    const best = fuzzyMatches[0];
    return {
      dish: existingDish || createNewDish(dish),
      recipe: best.recipe,
      confidence: best.similarity,
      method: 'fuzzy',
      reasons: [`Similarità ${(best.similarity * 100).toFixed(0)}%`],
    };
  }

  // 4. Match per keyword (almeno 2 keyword in comune)
  const keywordMatches = recipes
    .map(r => ({
      recipe: r,
      commonKeywords: dish.keywords.filter(k =>
        normalizeDishName(r.nome_piatto).keywords.includes(k)
      ).length,
    }))
    .filter(m => m.commonKeywords >= 2)
    .sort((a, b) => b.commonKeywords - a.commonKeywords);

  if (keywordMatches.length > 0) {
    return {
      dish: existingDish || createNewDish(dish),
      recipe: keywordMatches[0].recipe,
      confidence: Math.min(
        0.7,
        keywordMatches[0].commonKeywords / dish.keywords.length
      ),
      method: 'keyword',
      reasons: [`${keywordMatches[0].commonKeywords} keyword in comune`],
    };
  }

  // 5. Nessun match trovato
  return {
    dish: existingDish || createNewDish(dish),
    recipe: null,
    confidence: 0,
    method: null,
    reasons: ['Nessun match trovato'],
  };
}
```

### STEP 5: Salvataggio Dati

**Transazione Database:**

```typescript
async function saveImportData(
  importData: ImportData,
  locationId: string
): Promise<ImportResult> {
  // 1. Inizia transazione
  // 2. Crea sales_imports record
  // 3. Per ogni categoria: crea sales_categories
  // 4. Per ogni piatto:
  //    a. Cerca/crea sales_dishes
  //    b. Crea sales_dish_data
  //    c. Se collegato a ricetta, crea/aggiorna recipe_sales
  // 5. Calcola statistiche aggregate
  // 6. Aggiorna sales_imports con statistiche
  // 7. Commit transazione
  // 8. In caso di errore: rollback e log dettagliato
}
```

**Gestione Duplicati:**

- Se stesso piatto appare più volte nello stesso import: somma quantità e valori
- Se stesso periodo già importato: sovrascrivi (opzione utente) o errore

---

## 🎨 INTERFACCIA UTENTE DETTAGLIATA

### COMPONENTE PRINCIPALE: SalesAnalysis.tsx

**Struttura:**

```typescript
const SalesAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'links' | 'dashboard'>('import');
  const { currentLocation } = useAppContext();

  return (
    <div className="sales-analysis-container">
      <Header />
      <Tabs>
        <Tab id="import" label="Import Dati" icon={<UploadIcon />}>
          <ImportDataTab />
        </Tab>
        <Tab id="links" label="Gestione Collegamenti" icon={<LinkIcon />}>
          <ManageLinksTab />
        </Tab>
        <Tab id="dashboard" label="Dashboard" icon={<ChartIcon />}>
          <DashboardTab />
        </Tab>
      </Tabs>
    </div>
  );
};
```

### TAB 1: Import Dati - Dettaglio UI

#### Sezione 1: Upload File

```tsx
<FileUploadZone
  accept=".xls,.xlsx,.xlt"
  maxSize={10 * 1024 * 1024} // 10MB
  onFileSelect={handleFileSelect}
  preview={filePreview}
/>

// Componente FileUploadZone:
// - Drag & drop area grande e visibile
// - Pulsante "Sfoglia" prominente
// - Preview file: nome, dimensione, icona Excel
// - Validazione visiva: verde se valido, rosso se errore
// - Messaggi errore chiari: "File troppo grande", "Formato non supportato"
```

#### Sezione 2: Anteprima Dati

```tsx
<ImportPreview preview={parseResult} onConfirm={handleConfirmImport} />

// Mostra:
// - Tabella riepilogativa (prime 10 righe)
// - Tabella analitica (prime 20 righe con scroll)
// - Statistiche: totale categorie, totale piatti, totale quantità, totale valore
// - Piatti nuovi (non in sales_dishes): badge rosso
// - Piatti esistenti: badge verde
// - Match automatici trovati: badge blu con confidence
```

#### Sezione 3: Selezione Periodo

```tsx
<PeriodSelector
  defaultPeriod={suggestedPeriod} // Dal nome file o data corrente
  existingImports={existingImports}
  onPeriodChange={handlePeriodChange}
  conflictResolution={conflictResolution}
/>

// UI:
// - Dropdown mese (Gennaio-Dicembre) + Input anno
// - Se periodo già importato: alert giallo con opzioni:
//   * "Sovrascrivi import esistente"
//   * "Annulla"
//   * "Importa come nuovo periodo" (se possibile)
```

#### Sezione 4: Progress Import

```tsx
<ImportProgress
  status={importStatus}
  progress={importProgress}
  errors={importErrors}
  warnings={importWarnings}
/>

// Stati:
// - "Preparazione..." (0-10%)
// - "Parsing file..." (10-30%)
// - "Normalizzazione dati..." (30-50%)
// - "Matching ricette..." (50-70%)
// - "Salvataggio..." (70-90%)
// - "Completato" (100%)
// - "Errore" (con dettagli)
```

### TAB 2: Gestione Collegamenti - Dettaglio UI

#### Vista Lista Piatti

```tsx
<DishesList
  dishes={dishes}
  filters={filters}
  onLink={handleLink}
  onUnlink={handleUnlink}
/>

// Colonne Tabella:
// 1. Checkbox (selezione multipla)
// 2. Nome Piatto (con tooltip nome originale)
// 3. Categoria Gestionale (badge colorato)
// 4. Ricetta Collegata (link se presente, "Non collegato" se no)
// 5. Match Confidence (barra progresso se match automatico)
// 6. Statistiche (totale venduto, ultimo import)
// 7. Azioni (Collega/Modifica/Elimina)

// Filtri:
// - Testo libero (ricerca nome)
// - Dropdown: "Tutti" / "Collegati" / "Non collegati"
// - Dropdown categoria gestionale
// - Slider confidence (solo match automatici)
// - Periodo ultimo import
```

#### Modal Collegamento

```tsx
<LinkDishModal
  dish={selectedDish}
  recipes={recipes}
  onLink={handleLink}
  onClose={handleClose}
/>

// Contenuto:
// - Nome piatto da collegare (non modificabile, grande e chiaro)
// - Categoria gestionale (info)
// - Suggerimenti automatici (top 5 match con confidence)
// - Ricerca ricette:
//   * Input ricerca (filtra per nome)
//   * Dropdown categoria app
//   * Lista risultati con preview ricetta (nome, categoria, prezzo)
// - Pulsante "Collega" (solo se ricetta selezionata)
// - Pulsante "Rimuovi collegamento" (se già collegato)
```

#### Batch Operations

```tsx
<BatchLinkActions
  selectedDishes={selectedDishes}
  onBatchLink={handleBatchLink}
  onBatchUnlink={handleBatchUnlink}
/>

// Operazioni:
// - "Collega tutti i suggeriti" (solo match confidence > 0.8)
// - "Rimuovi collegamenti selezionati"
// - "Esporta lista non collegati" (CSV)
```

### TAB 3: Dashboard - Dettaglio UI

#### Filtri Globali

```tsx
<DashboardFilters
  granularity={granularity}
  period={period}
  category={category}
  recipe={recipe}
  onFilterChange={handleFilterChange}
/>

// Layout:
// - Prima riga: Granularità (pill buttons) + Periodo (dropdown dinamico)
// - Seconda riga: Categoria gestionale + Ricetta + Altri filtri avanzati
// - Terza riga: Confronto periodo (toggle: "Confronta con periodo precedente")
```

#### Widget Dashboard (Grid Layout Responsive)

**1. KPI Cards (4 colonne)**

```tsx
<KPIWidget
  title="Totale Venduto"
  value={formatCurrency(totalValue)}
  change={calculateChange(currentPeriod, previousPeriod)}
  trend={trend}
  icon={<MoneyIcon />}
  color="green"
/>

// Calcoli:
// - change: percentuale vs periodo precedente
// - trend: "up" | "down" | "stable" (con icona freccia)
// - Formattazione: verde positivo, rosso negativo
```

**2. Grafico Andamento Vendite**

```tsx
<LineChart
  data={salesTrendData}
  xKey="date"
  yKey="value"
  lines={[
    { key: 'total', label: 'Totale', color: '#3B82F6' },
    { key: 'linked', label: 'Collegati', color: '#10B981' },
    { key: 'unlinked', label: 'Non collegati', color: '#EF4444' },
  ]}
  showTooltip
  showLegend
/>

// Dati aggregati per granularità:
// - Mese: per giorno
// - Trimestre: per settimana
// - Anno: per mese
```

**3. Distribuzione Categorie**

```tsx
<PieChart
  data={categoryDistribution}
  labelKey="category"
  valueKey="value"
  showPercentage
  showLegend
  onSliceClick={handleCategoryClick} // Drill-down
/>

// Interattività:
// - Click slice: filtra dashboard per categoria
// - Hover: tooltip con dettagli
```

**4. Top 10 Piatti**

```tsx
<BarChart
  data={topDishes}
  xKey="dishName"
  yKey="quantity" // o "value" (toggle)
  orientation="horizontal"
  showValueLabels
  colorBy="linked" // Verde se collegato, grigio se no
/>

// Toggle:
// - Per quantità venduta
// - Per valore generato
// - Per margine (se collegato)
```

**5. Analisi Previsionale**

```tsx
<ForecastChart
  historicalData={historicalData}
  forecastPeriods={6} // Prossimi 6 mesi
  method="linear_regression" // o "moving_average"
  confidenceInterval={0.95}
/>

// Visualizzazione:
// - Linea blu: dati storici
// - Linea tratteggiata: previsione
// - Area ombreggiata: intervallo confidenza
// - Tooltip: mostra valore previsto ± margine errore
```

**6. Tabella Dettaglio**

```tsx
<DataTable
  columns={[
    { key: 'dishName', label: 'Piatto', sortable: true },
    { key: 'category', label: 'Categoria', filterable: true },
    { key: 'quantity', label: 'Quantità', sortable: true, align: 'right' },
    {
      key: 'value',
      label: 'Valore',
      sortable: true,
      align: 'right',
      format: 'currency',
    },
    {
      key: 'unitPrice',
      label: 'Prezzo Unit.',
      sortable: true,
      align: 'right',
      format: 'currency',
    },
    {
      key: 'percentage',
      label: '% Totale',
      sortable: true,
      align: 'right',
      format: 'percentage',
    },
    { key: 'trend', label: 'Trend', sortable: false, render: renderTrend },
    { key: 'linked', label: 'Collegato', sortable: true, render: renderLinked },
  ]}
  data={tableData}
  pagination={{ pageSize: 50 }}
  exportable
/>
```

---

## 📡 API ENDPOINTS DETTAGLIATI

### 1. Upload e Preview

```
POST /api/sales-analysis/upload-preview
Content-Type: multipart/form-data
Body: { file: File }

Response: {
  preview: {
    fileName: string;
    fileSize: number;
    sheets: Array<{ name: string; rowCount: number }>;
    summaryTable: {
      rows: CategorySummary[];
      totalRows: number;
    };
    detailTable: {
      rows: DishDetail[];
      totalRows: number;
      sampleRows: DishDetail[]; // Prime 20
    };
  };
  validation: {
    isValid: boolean;
    errors: Array<{
      type: string;
      message: string;
      row?: number;
      column?: string;
    }>;
    warnings: Array<{
      type: string;
      message: string;
      suggestion?: string;
    }>;
  };
}
```

### 2. Import Dati

```
POST /api/sales-analysis/import
Headers: {
  Authorization: Bearer <token>,
  X-Location-Id: <locationId>
}
Body: {
  file: File, // Multipart
  periodMonth: number,
  periodYear: number,
  overwriteExisting?: boolean
}

Response: {
  success: boolean;
  importId: string;
  stats: {
    categoriesImported: number;
    dishesImported: number;
    dishesNew: number;
    dishesExisting: number;
    dishesMatched: number;
    dishesUnmatched: number;
    totalQuantity: number;
    totalValue: number;
  };
  matches: Array<{
    dishId: string;
    dishName: string;
    recipeId: string | null;
    recipeName: string | null;
    confidence: number;
    method: string;
  }>;
  errors: Array<{
    type: string;
    message: string;
    row?: number;
  }>;
  warnings: Array<{
    type: string;
    message: string;
  }>;
}
```

### 3. Lista Import

```
GET /api/sales-analysis/imports?locationId=xxx&limit=50&offset=0

Response: {
  imports: SalesImport[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

### 4. Lista Piatti

```
GET /api/sales-analysis/dishes?locationId=xxx&linked=true&category=xxx&search=xxx&limit=100&offset=0

Response: {
  dishes: Array<{
    id: string;
    dishName: string;
    dishNameOriginal: string;
    categoryGestionale: string;
    recipeId: string | null;
    recipeName: string | null;
    isLinked: boolean;
    matchConfidence: number | null;
    matchMethod: string | null;
    totalImports: number;
    totalQuantitySold: number;
    totalValueGenerated: number;
    lastSeenDate: string;
  }>;
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

### 5. Collega Piatto

```
PUT /api/sales-analysis/dishes/:dishId/link
Body: {
  recipeId: string | null
}

Response: {
  success: boolean;
  dish: SalesDish;
  recipeSalesCreated: number; // Numero record recipe_sales creati
}
```

### 6. Batch Link

```
POST /api/sales-analysis/dishes/batch-link
Body: {
  links: Array<{
    dishId: string;
    recipeId: string | null;
  }>
}

Response: {
  success: boolean;
  linked: number;
  errors: Array<{
    dishId: string;
    error: string;
  }>;
}
```

### 7. Dashboard Data

```
GET /api/sales-analysis/dashboard?locationId=xxx&granularity=mese&periodMonth=1&periodYear=2024&category=xxx&recipeId=xxx&compareWithPrevious=true

Response: {
  kpis: {
    totalValue: number;
    totalQuantity: number;
    uniqueDishes: number;
    averageTicket: number;
    linkedDishesCount: number;
    unlinkedDishesCount: number;
    trends: {
      value: { change: number; trend: 'up' | 'down' | 'stable' };
      quantity: { change: number; trend: 'up' | 'down' | 'stable' };
      // ...
    };
    comparison?: {
      previousPeriod: {
        totalValue: number;
        totalQuantity: number;
        // ...
      };
      changes: {
        value: number; // percentuale
        quantity: number;
        // ...
      };
    };
  };
  charts: {
    salesTrend: Array<{
      date: string;
      total: number;
      linked: number;
      unlinked: number;
    }>;
    categoryDistribution: Array<{
      category: string;
      quantity: number;
      value: number;
      percentage: number;
    }>;
    topDishes: Array<{
      dishId: string;
      dishName: string;
      quantity: number;
      value: number;
      isLinked: boolean;
      recipeId: string | null;
    }>;
    forecast: {
      historical: Array<{ date: string; value: number }>;
      predicted: Array<{
        date: string;
        value: number;
        lowerBound: number;
        upperBound: number;
      }>;
    };
  };
  table: {
    dishes: Array<DishDetail>;
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}
```

---

## 🔗 INTEGRAZIONE MENU MIX

### Modifiche a MenuMix.tsx

**Aggiunta Filtro Temporale:**

```typescript
// Nuovi stati
const [timeGranularity, setTimeGranularity] = useState<TimeGranularity>('anno');
const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>({
  year: new Date().getFullYear()
});

// Filtro recipeSales
const filteredRecipeSales = useMemo(() => {
  return filterRecipeSalesByPeriod(recipeSales, timeGranularity, selectedPeriod);
}, [recipeSales, timeGranularity, selectedPeriod]);

// UI Filtro (sopra Category Tabs)
<TimeFilterPanel
  granularity={timeGranularity}
  period={selectedPeriod}
  onGranularityChange={setTimeGranularity}
  onPeriodChange={setSelectedPeriod}
/>
```

**Aggiornamento Calcolo Popolarità:**

- Usa `filteredRecipeSales` invece di `recipeSales` completo
- Popolarità calcolata solo sul periodo selezionato
- Media popolarità ricalcolata sul periodo filtrato

---

## ✅ CHECKLIST IMPLEMENTAZIONE DETTAGLIATA

### FASE 1: Database (Priorità ALTA)

- [ ] Eseguire script SQL migrazione in Supabase
- [ ] Verificare creazione tabelle
- [ ] Testare trigger e funzioni
- [ ] Creare indici per performance
- [ ] Testare foreign key constraints
- [ ] Verificare RLS policies (se necessario)

### FASE 2: Backend - Parsing Excel (Priorità ALTA)

- [ ] Installare libreria Excel (xlsx o exceljs)
- [ ] Implementare funzione detectTables
- [ ] Implementare normalizzazione nomi
- [ ] Implementare validazione dati
- [ ] Gestione errori parsing
- [ ] Test con file reali

### FASE 3: Backend - Matching (Priorità ALTA)

- [ ] Implementare algoritmo matching esatto
- [ ] Implementare algoritmo fuzzy (Levenshtein)
- [ ] Implementare matching per keyword
- [ ] Calcolo confidence score
- [ ] Test matching con dati reali

### FASE 4: Backend - API Endpoints (Priorità ALTA)

- [ ] POST /upload-preview
- [ ] POST /import
- [ ] GET /imports
- [ ] GET /dishes
- [ ] PUT /dishes/:id/link
- [ ] POST /batch-link
- [ ] GET /dashboard
- [ ] Gestione errori e validazione

### FASE 5: Frontend - Componenti Base (Priorità ALTA)

- [ ] SalesAnalysis.tsx (componente principale)
- [ ] FileUploadZone.tsx
- [ ] ImportPreview.tsx
- [ ] PeriodSelector.tsx
- [ ] ImportProgress.tsx
- [ ] DishesList.tsx
- [ ] LinkDishModal.tsx
- [ ] DashboardFilters.tsx

### FASE 6: Frontend - Dashboard Widgets (Priorità MEDIA)

- [ ] KPIWidget.tsx
- [ ] LineChart.tsx (usando recharts)
- [ ] PieChart.tsx
- [ ] BarChart.tsx
- [ ] ForecastChart.tsx
- [ ] DataTable.tsx
- [ ] HeatmapCalendar.tsx (opzionale)

### FASE 7: Integrazione Menu Mix (Priorità ALTA)

- [ ] Aggiungere filtro temporale a MenuMix.tsx
- [ ] Aggiornare calcolo popolarità
- [ ] Test integrazione

### FASE 8: Testing (Priorità ALTA)

- [ ] Test unitari parsing Excel
- [ ] Test unitari matching
- [ ] Test integrazione API
- [ ] Test end-to-end import
- [ ] Test performance con file grandi
- [ ] Test edge cases

### FASE 9: Refinement (Priorità MEDIA)

- [ ] Ottimizzazione performance
- [ ] Miglioramento UX
- [ ] Gestione errori user-friendly
- [ ] Documentazione utente
- [ ] Analytics e monitoring

---

## 🎯 PRIORITÀ IMPLEMENTAZIONE

**SPRINT 1 (MVP):**

1. Database schema
2. Parsing Excel base
3. Import dati base
4. Lista piatti
5. Collegamento manuale piatto-ricetta
6. Dashboard base (KPI + grafico semplice)

**SPRINT 2:**

1. Matching automatico
2. Dashboard completa
3. Filtri avanzati
4. Integrazione Menu Mix

**SPRINT 3:**

1. Analisi previsionale
2. Export report
3. Batch operations
4. Ottimizzazioni

---

## 📝 NOTE FINALI

Questa progettazione è completa e pronta per l'implementazione. Ogni componente è dettagliato con:

- Struttura dati
- Algoritmi
- UI/UX
- Edge cases
- Validazioni
- Gestione errori

**Prossimo passo:** Iniziare implementazione FASE 1 (Database).
