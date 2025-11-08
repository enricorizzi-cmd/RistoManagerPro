# 🔗 INTEGRAZIONE ANALISI VENDITE CON MENU MIX

## 📋 OBIETTIVO

Aggiungere il filtro temporale al componente Menu Mix per permettere l'analisi della matrice BCG su periodi specifici.

---

## 🔧 MODIFICHE NECESSARIE

### 1. **Aggiornamento Types** (`components/menu-engineering/types.ts`)

Aggiungere nuovi tipi per la granularità temporale:

```typescript
export type TimeGranularity =
  | 'mese'
  | 'trimestre'
  | 'quadrimestre'
  | 'semestre'
  | 'anno'
  | 'totale';

export interface PeriodFilter {
  granularity: TimeGranularity;
  month?: number; // 1-12 per mese
  quarter?: number; // 1-4 per trimestre
  quadrimestre?: number; // 1-3 per quadrimestre
  semester?: number; // 1-2 per semestre
  year: number; // Anno
}
```

---

### 2. **Modifiche a MenuMix.tsx**

#### A. Aggiungere stati per filtro temporale

```typescript
const [timeGranularity, setTimeGranularity] = useState<TimeGranularity>('anno');
const [selectedPeriod, setSelectedPeriod] = useState<{
  month?: number;
  quarter?: number;
  quadrimestre?: number;
  semester?: number;
  year: number;
}>({
  year: new Date().getFullYear(),
});
```

#### B. Funzione per filtrare recipeSales in base al periodo

```typescript
const filteredRecipeSales = useMemo(() => {
  if (timeGranularity === 'totale') {
    return recipeSales; // Tutti i dati
  }

  return recipeSales.filter(sale => {
    const saleDate = new Date(sale.date);
    const saleYear = saleDate.getFullYear();
    const saleMonth = saleDate.getMonth() + 1; // 1-12

    switch (timeGranularity) {
      case 'mese':
        return (
          saleYear === selectedPeriod.year && saleMonth === selectedPeriod.month
        );

      case 'trimestre':
        const quarter = Math.ceil(saleMonth / 3); // 1-4
        return (
          saleYear === selectedPeriod.year && quarter === selectedPeriod.quarter
        );

      case 'quadrimestre':
        const quadrimestre = Math.ceil(saleMonth / 4); // 1-3
        return (
          saleYear === selectedPeriod.year &&
          quadrimestre === selectedPeriod.quadrimestre
        );

      case 'semestre':
        const semester = saleMonth <= 6 ? 1 : 2;
        return (
          saleYear === selectedPeriod.year &&
          semester === selectedPeriod.semester
        );

      case 'anno':
        return saleYear === selectedPeriod.year;

      default:
        return true;
    }
  });
}, [recipeSales, timeGranularity, selectedPeriod]);
```

#### C. Aggiornare `getRecipePopularity` per usare `filteredRecipeSales`

```typescript
const getRecipePopularity = useCallback(
  (recipeId: string): number => {
    const sales = filteredRecipeSales.filter(s => s.recipeId === recipeId);
    const totalQuantity = sales.reduce((sum, s) => sum + s.quantity, 0);

    const maxSales = Math.max(
      ...filteredRecipes.map(r =>
        filteredRecipeSales
          .filter(s => s.recipeId === r.id)
          .reduce((sum, s) => sum + s.quantity, 0)
      ),
      1
    );

    return maxSales > 0 ? (totalQuantity / maxSales) * 100 : 0;
  },
  [filteredRecipes, filteredRecipeSales]
);
```

#### D. Aggiornare `bcgMatrix` useMemo per usare `filteredRecipeSales`

```typescript
const bcgMatrix = useMemo<BCGMatrix>(() => {
  // ... calcoli esistenti usando getRecipePopularity che ora usa filteredRecipeSales
}, [filteredRecipes, getRecipePopularity]);
```

#### E. Aggiungere UI per filtro temporale

Aggiungere sopra la sezione "Category Tabs":

```typescript
{/* Time Filter Section */}
<div className="bg-white rounded-lg shadow p-4 border border-gray-200 mb-4">
  <div className="flex flex-wrap items-center gap-4">
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">
        Granularità:
      </label>
      <select
        value={timeGranularity}
        onChange={(e) => {
          const newGranularity = e.target.value as TimeGranularity;
          setTimeGranularity(newGranularity);
          // Reset periodo quando cambia granularità
          if (newGranularity === 'totale') {
            setSelectedPeriod({ year: new Date().getFullYear() });
          }
        }}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="mese">Mese</option>
        <option value="trimestre">Trimestre</option>
        <option value="quadrimestre">Quadrimestre</option>
        <option value="semestre">Semestre</option>
        <option value="anno">Anno</option>
        <option value="totale">Totale</option>
      </select>
    </div>

    {timeGranularity !== 'totale' && (
      <>
        {/* Selettore Anno */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Anno:</label>
          <select
            value={selectedPeriod.year}
            onChange={(e) =>
              setSelectedPeriod({
                ...selectedPeriod,
                year: parseInt(e.target.value),
              })
            }
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        {/* Selettore Periodo in base a granularità */}
        {timeGranularity === 'mese' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Mese:</label>
            <select
              value={selectedPeriod.month || 1}
              onChange={(e) =>
                setSelectedPeriod({
                  ...selectedPeriod,
                  month: parseInt(e.target.value),
                })
              }
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {[
                'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
              ].map((month, index) => (
                <option key={index + 1} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        )}

        {timeGranularity === 'trimestre' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Trimestre:</label>
            <select
              value={selectedPeriod.quarter || 1}
              onChange={(e) =>
                setSelectedPeriod({
                  ...selectedPeriod,
                  quarter: parseInt(e.target.value),
                })
              }
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {['Q1', 'Q2', 'Q3', 'Q4'].map((q, index) => (
                <option key={index + 1} value={index + 1}>
                  {q}
                </option>
              ))}
            </select>
          </div>
        )}

        {timeGranularity === 'quadrimestre' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Quadrimestre:</label>
            <select
              value={selectedPeriod.quadrimestre || 1}
              onChange={(e) =>
                setSelectedPeriod({
                  ...selectedPeriod,
                  quadrimestre: parseInt(e.target.value),
                })
              }
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {['1° Quadrimestre', '2° Quadrimestre', '3° Quadrimestre'].map((q, index) => (
                <option key={index + 1} value={index + 1}>
                  {q}
                </option>
              ))}
            </select>
          </div>
        )}

        {timeGranularity === 'semestre' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Semestre:</label>
            <select
              value={selectedPeriod.semester || 1}
              onChange={(e) =>
                setSelectedPeriod({
                  ...selectedPeriod,
                  semester: parseInt(e.target.value),
                })
              }
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={1}>1° Semestre</option>
              <option value={2}>2° Semestre</option>
            </select>
          </div>
        )}

        {/* Pulsante Reset */}
        <button
          onClick={() => {
            setTimeGranularity('anno');
            setSelectedPeriod({ year: new Date().getFullYear() });
          }}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition"
        >
          Reset
        </button>
      </>
    )}
  </div>

  {/* Info periodo selezionato */}
  <div className="mt-2 text-xs text-gray-500">
    {timeGranularity === 'totale' ? (
      <span>Visualizzando tutti i dati disponibili</span>
    ) : (
      <span>
        Periodo: {getPeriodLabel(timeGranularity, selectedPeriod)}
      </span>
    )}
  </div>
</div>
```

#### F. Funzione helper per label periodo

```typescript
const getPeriodLabel = (
  granularity: TimeGranularity,
  period: typeof selectedPeriod
): string => {
  const months = [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ];

  switch (granularity) {
    case 'mese':
      return `${months[(period.month || 1) - 1]} ${period.year}`;
    case 'trimestre':
      return `Q${period.quarter || 1} ${period.year}`;
    case 'quadrimestre':
      return `${period.quadrimestre || 1}° Quadrimestre ${period.year}`;
    case 'semestre':
      return `${period.semester || 1}° Semestre ${period.year}`;
    case 'anno':
      return `Anno ${period.year}`;
    default:
      return '';
  }
};
```

---

## 📊 AGGIORNAMENTO API

### Modificare endpoint `getRecipeSales`

L'endpoint `/api/menu-engineering/recipe-sales` potrebbe essere esteso per accettare parametri di filtro temporale:

```
GET /api/menu-engineering/recipe-sales?locationId=xxx&year=2024&month=1
GET /api/menu-engineering/recipe-sales?locationId=xxx&year=2024&quarter=1
```

**Nota:** Per ora il filtro può essere fatto lato frontend, ma per performance future potrebbe essere meglio filtrarlo lato backend.

---

## ✅ CHECKLIST IMPLEMENTAZIONE

- [ ] Aggiungere tipi `TimeGranularity` e `PeriodFilter` a `types.ts`
- [ ] Aggiungere stati per filtro temporale in `MenuMix.tsx`
- [ ] Implementare funzione `filteredRecipeSales`
- [ ] Aggiornare `getRecipePopularity` per usare `filteredRecipeSales`
- [ ] Aggiornare `bcgMatrix` useMemo
- [ ] Aggiungere UI filtro temporale
- [ ] Implementare funzione `getPeriodLabel`
- [ ] Testare filtri con dati reali
- [ ] Verificare che calcoli popolarità siano corretti
- [ ] Verificare che matrice BCG si aggiorni correttamente

---

## 🎨 COERENZA GRAFICA

- Usare stesso stile dei filtri categoria esistenti
- Mantenere stesso spacing e padding
- Usare stessi colori primari/secondari
- Stesso stile dropdown e select

---

## 🔍 CONSIDERAZIONI

### Performance

- Il filtro viene fatto lato frontend, quindi con molti dati potrebbe essere lento
- Considerare di implementare filtro lato backend per grandi dataset

### Default

- Di default mostra anno corrente (da Gennaio a oggi)
- Se non ci sono dati per il periodo selezionato, mostrare messaggio informativo

### Validazione

- Verificare che il periodo selezionato abbia dati disponibili
- Mostrare avviso se periodo senza dati
