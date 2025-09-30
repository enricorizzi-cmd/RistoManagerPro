// Inserisci Dati Component
// Data entry form for monthly financial plan metrics

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAppContext } from '../../contexts/AppContext';
import { useFinancialPlanData } from '../../hooks/useFinancialPlanData';
import { buildMonthKey, parseMonthKey } from '../../utils/financialPlanUtils';
import type { FinancialCausaleGroup } from '../../data/financialPlanData';

interface DataEntry {
  id: string;
  dataInserimento: string;
  mese: number; // 0-11 (month index)
  anno: number;
  tipologiaCausale: string;
  categoria: string;
  causale: string;
  valore: number;
}

interface MetricField {
  id: string;
  label: string;
  value: string;
  lastValue: string;
}

interface InserisciDatiProps {
  causaliCatalog: FinancialCausaleGroup[];
}

export const InserisciDati: React.FC<InserisciDatiProps> = ({ causaliCatalog }) => {
  const { showNotification } = useAppContext();
  const { setOverride, handleSavePlan, handleSaveMetrics, consuntivoOverrides } = useFinancialPlanData();
  
  // Form state
  const [mese, setMese] = useState<number>(new Date().getMonth());
  const [anno, setAnno] = useState<number>(new Date().getFullYear());
  const [tipologiaCausale, setTipologiaCausale] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('');
  const [causale, setCausale] = useState<string>('');
  const [valore, setValore] = useState<string>('0,00');
  
  // Saved entries - loaded from database
  const [savedEntries, setSavedEntries] = useState<DataEntry[]>([]);
  
  // Metrics section state
  const [metricsExpanded, setMetricsExpanded] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<MetricField[]>([
    { id: 'fatturato', label: 'Fatturato mensile', value: '', lastValue: '-' },
    { id: 'saldo-conto', label: 'Saldo conto fine mese', value: '', lastValue: '-' },
    { id: 'crediti-pendenti', label: 'Crediti pendenti fine mese', value: '', lastValue: '-' },
    { id: 'crediti-scaduti', label: 'Crediti scaduti fine mese', value: '', lastValue: '-' },
    { id: 'debiti-pendenti', label: 'Debiti pendenti fine mese', value: '', lastValue: '-' },
    { id: 'debiti-scaduti', label: 'Debiti scaduti fine mese', value: '', lastValue: '-' },
  ]);
  const waitForStateFlush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  // Get available tipologie
  const availableTipologie = useMemo(() => 
    causaliCatalog.map(group => group.macroCategory), [causaliCatalog]
  );

  // Get available categorie based on selected tipologia
  const availableCategorie = useMemo(() => {
    if (!tipologiaCausale) {
      // If no tipologia selected, show all categories from all tipologie
      return causaliCatalog.flatMap(group => group.categories.map(cat => cat.name));
    }
    const group = causaliCatalog.find(g => g.macroCategory === tipologiaCausale);
    return group?.categories.map(cat => cat.name) || [];
  }, [causaliCatalog, tipologiaCausale]);

  // Get available causali based on selected tipologia and categoria
  const availableCausali = useMemo(() => {
    if (!tipologiaCausale) {
      // If no tipologia selected, show all causali
      return causaliCatalog.flatMap(group => 
        group.categories.flatMap(cat => cat.items)
      );
    }
    
    const group = causaliCatalog.find(g => g.macroCategory === tipologiaCausale);
    if (!group) return [];
    
    if (!categoria) {
      // If no categoria selected, show all causali from the tipologia
      return group.categories.flatMap(cat => cat.items);
    }
    
    // Show only causali from the selected categoria
    const selectedCategory = group.categories.find(cat => cat.name === categoria);
    return selectedCategory?.items || [];
  }, [causaliCatalog, tipologiaCausale, categoria]);

  // Month names in Italian
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Load existing data from database on component mount
  useEffect(() => {
    const loadExistingData = () => {
      const entries: DataEntry[] = [];
      
      // Convert consuntivoOverrides to DataEntry format
      Object.entries(consuntivoOverrides).forEach(([tipologia, categories]) => {
        Object.entries(categories).forEach(([categoria, details]) => {
          Object.entries(details).forEach(([causale, months]) => {
            Object.entries(months).forEach(([monthKey, value]) => {
              const parsed = parseMonthKey(monthKey);
              if (parsed && value !== 0) {
                entries.push({
                  id: `${tipologia}-${categoria}-${causale}-${monthKey}`,
                  dataInserimento: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it }),
                  mese: parsed.monthIndex,
                  anno: parsed.year,
                  tipologiaCausale: tipologia,
                  categoria: categoria,
                  causale: causale,
                  valore: value
                });
              }
            });
          });
        });
      });
      
      // Sort by date (newest first)
      entries.sort((a, b) => {
        if (a.anno !== b.anno) return b.anno - a.anno;
        return b.mese - a.mese;
      });
      
      setSavedEntries(entries);
    };

    loadExistingData();
  }, [consuntivoOverrides]);

  // Format current date for display
  const currentDate = format(new Date(), 'dd/MM/yyyy HH:mm');

  // Auto-completion logic
  const handleTipologiaChange = (value: string) => {
    setTipologiaCausale(value);
    setCategoria('');
    setCausale('');
  };

  const handleCategoriaChange = (value: string) => {
    setCategoria(value);
    setCausale('');
    
    // Auto-fill tipologia if not set
    if (!tipologiaCausale) {
      const group = causaliCatalog.find(g => 
        g.categories.some(cat => cat.name === value)
      );
      if (group) {
        setTipologiaCausale(group.macroCategory);
      }
    }
  };

  const handleCausaleChange = (value: string) => {
    setCausale(value);
    
    // Auto-fill tipologia and categoria if not set
    if (!tipologiaCausale || !categoria) {
      const group = causaliCatalog.find(g => 
        g.categories.some(cat => cat.items.includes(value))
      );
      if (group) {
        if (!tipologiaCausale) {
          setTipologiaCausale(group.macroCategory);
        }
        
        if (!categoria) {
          const category = group.categories.find(cat => cat.items.includes(value));
          if (category) {
            setCategoria(category.name);
          }
        }
      }
    }
  };

  // Handle value input formatting
  const handleValoreChange = (value: string) => {
    // Remove non-numeric characters except comma and dot
    const cleaned = value.replace(/[^\d,.-]/g, '');
    setValore(cleaned);
  };

  // Convert Italian number format to number
  const parseItalianNumber = (value: string): number => {
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Format number to Italian format
  const formatItalianNumber = (value: number): string => {
    return value.toFixed(2).replace('.', ',');
  };

  // Save entry
  const handleSaveEntry = async () => {
    const numericValue = parseItalianNumber(valore);

    if (numericValue === 0) {
      showNotification('Inserisci un valore diverso da zero.', 'error');
      return;
    }

    if (!tipologiaCausale) {
      showNotification('Seleziona una tipologia.', 'error');
      return;
    }

    if (!categoria) {
      showNotification('Seleziona una categoria.', 'error');
      return;
    }

    if (!causale.trim()) {
      showNotification('Inserisci una causale.', 'error');
      return;
    }

    const monthKey = buildMonthKey(anno, mese);
    const category = categoria;
    const existingValue = consuntivoOverrides?.[tipologiaCausale]?.[category]?.[causale]?.[monthKey] ?? 0;
    const delta = numericValue - existingValue;

    if (delta === 0) {
      showNotification('Il valore inserito e\' gia\' presente.', 'info');
      return;
    }

    try {
      setOverride('consuntivo', tipologiaCausale, category, causale, anno, mese, delta);

      await waitForStateFlush();

      const saveKey = `consuntivo|${tipologiaCausale}|${category}|${causale}|${monthKey}`;
      await handleSavePlan(anno, new Set([saveKey]));

      showNotification('Riga salvata con successo.', 'success');

      setValore('0,00');
      setCausale('');
      setCategoria('');
      setTipologiaCausale('');

    } catch (error) {
      console.error('Error saving entry:', error);
      showNotification('Errore nel salvataggio della riga.', 'error');
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    const entry = savedEntries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      const monthKey = buildMonthKey(entry.anno, entry.mese);
      const category = entry.categoria;

      setOverride('consuntivo', entry.tipologiaCausale, category, entry.causale, entry.anno, entry.mese, null);

      await waitForStateFlush();

      await handleSavePlan(entry.anno, new Set([`consuntivo|${entry.tipologiaCausale}|${category}|${entry.causale}|${monthKey}`]));

      showNotification('Riga eliminata con successo.', 'success');
    } catch (error) {
      console.error('Error deleting entry:', error);
      showNotification('Errore nell\'eliminazione della riga.', 'error');
    }
  };

  // Edit entry
  const handleEditEntry = (entry: DataEntry) => {
    setMese(entry.mese);
    setAnno(entry.anno);
    setTipologiaCausale(entry.tipologiaCausale);
    setCategoria(entry.categoria);
    setCausale(entry.causale);
    setValore(formatItalianNumber(entry.valore));
  };

  // Handle metrics field change
  const handleMetricChange = (id: string, value: string) => {
    setMetrics(prev => prev.map(metric => 
      metric.id === id ? { ...metric, value } : metric
    ));
  };

  // Save metrics
  const handleSaveMetricsLocal = async () => {
    try {
      // Create metrics entry
      const metricsEntry = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        year: anno,
        month: mese + 1, // Convert to 1-based month
        values: metrics.reduce((acc, metric) => {
          const numericValue = parseItalianNumber(metric.value);
          acc[metric.id] = numericValue;
          return acc;
        }, {} as Record<string, number>)
      };

      // Save to database
      await handleSaveMetrics(metricsEntry);
      showNotification('Indicatori salvati con successo.', 'success');
      
      // Reset metrics form
      setMetrics(prev => prev.map(metric => ({ ...metric, value: '' })));
    } catch (error) {
      console.error('Error saving metrics:', error);
      showNotification('Errore nel salvataggio degli indicatori.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Inserisci metriche mensili section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer"
          onClick={() => setMetricsExpanded(!metricsExpanded)}
        >
          <h2 className="text-lg font-semibold text-gray-900">Inserisci metriche mensili</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Prossimo mese proposto: {monthNames[mese].toLowerCase()} {anno}</span>
            <span className="text-sm text-gray-500 hover:text-gray-700">
              {metricsExpanded ? 'Nascondi' : 'Mostra'}
            </span>
          </div>
        </div>
        
        {metricsExpanded && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {metrics.map((metric) => (
                <div key={metric.id} className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {metric.label}
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    Ultimo valore: {metric.lastValue}
                  </div>
                  <input
                    type="text"
                    value={metric.value}
                    onChange={(e) => handleMetricChange(metric.id, e.target.value)}
                    placeholder="Inserisci valore"
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveMetricsLocal}
                className="bg-primary text-white px-6 py-2 rounded text-sm font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Salva indicatori
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Registro inserimenti section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Registro inserimenti</h3>
          <p className="text-sm text-gray-600">Inserisci una nuova riga per aggiornare il piano mensile.</p>
        </div>

        {/* Data entry form */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-8 gap-4 items-end">
            {/* DATA INSERIMENTO */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                DATA INSERIMENTO
              </label>
              <div className="text-sm text-gray-600 bg-white border border-gray-300 rounded px-3 py-2">
                {currentDate}
              </div>
            </div>

            {/* MESE */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                MESE
              </label>
              <select
                value={mese}
                onChange={(e) => setMese(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* ANNO */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                ANNO
              </label>
              <select
                value={anno}
                onChange={(e) => setAnno(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* TIPOLOGIA CAUSALE */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                TIPOLOGIA CAUSALE
              </label>
              <select
                value={tipologiaCausale}
                onChange={(e) => handleTipologiaChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleziona tipologia</option>
                {availableTipologie.map(tipologia => (
                  <option key={tipologia} value={tipologia}>
                    {tipologia}
                  </option>
                ))}
              </select>
            </div>

            {/* CATEGORIA */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                CATEGORIA
              </label>
              <select
                value={categoria}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleziona categoria</option>
                {availableCategorie.map(categoriaItem => (
                  <option key={categoriaItem} value={categoriaItem}>
                    {categoriaItem}
                  </option>
                ))}
              </select>
            </div>

            {/* CAUSALE */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                CAUSALE
              </label>
              <select
                value={causale}
                onChange={(e) => handleCausaleChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleziona causale</option>
                {availableCausali.map(causaleItem => (
                  <option key={causaleItem} value={causaleItem}>
                    {causaleItem}
                  </option>
                ))}
              </select>
            </div>

            {/* VALORE */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                VALORE
              </label>
              <input
                type="text"
                value={valore}
                onChange={(e) => handleValoreChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0,00"
              />
            </div>

            {/* Salva riga button */}
            <div className="flex flex-col items-end">
              <button
                onClick={handleSaveEntry}
                className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Salva riga
              </button>
              <span className="text-xs text-gray-500 mt-1">Righe salvate in basso</span>
            </div>
          </div>
        </div>

        {/* Saved entries */}
        {savedEntries.length > 0 && (
          <div className="space-y-2">
            {savedEntries.map((entry) => (
              <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-7 gap-4 items-center">
                  <div className="text-sm text-gray-600">
                    {entry.dataInserimento}
                  </div>
                  <div className="text-sm text-gray-600">
                    {monthNames[entry.mese].toLowerCase()} {entry.anno}
                  </div>
                  <div className="text-sm text-gray-600">
                    {entry.tipologiaCausale}
                  </div>
                  <div className="text-sm text-gray-600">
                    {entry.categoria}
                  </div>
                  <div className="text-sm text-gray-600">
                    {entry.causale}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatItalianNumber(entry.valore)} €
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditEntry(entry)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
