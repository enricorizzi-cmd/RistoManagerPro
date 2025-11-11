// Inserisci Dati Component
// Data entry form for monthly financial plan metrics

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancialPlanData } from '../../hooks/useFinancialPlanData';
import type { FinancialCausaleGroup } from '../../data/financialPlanData';
import { API_BASE_URL } from '../../src/config/api';

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
  monthlyMetrics?: any[];
}

export const InserisciDati: React.FC<InserisciDatiProps> = ({
  causaliCatalog,
  monthlyMetrics = [],
}) => {
  const { showNotification, currentLocation } = useAppContext();
  const { token } = useAuth();
  const { handleSaveMetrics } = useFinancialPlanData(currentLocation?.id);

  // Calculate previous month (mese precedente al mese in corso)
  const getPreviousMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Previous month is the month before current month
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    return { year: previousYear, monthIndex: previousMonth };
  }, []);

  // Form state - initialize with previous month
  const [mese, setMese] = useState<number>(getPreviousMonth.monthIndex);
  const [anno, setAnno] = useState<number>(getPreviousMonth.year);
  const [tipologiaCausale, setTipologiaCausale] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('');
  const [causale, setCausale] = useState<string>('');
  const [valore, setValore] = useState<string>('0,00');

  // Dropdown search state
  const [causaleSearchTerm, setCausaleSearchTerm] = useState<string>('');
  const [showCausaleDropdown, setShowCausaleDropdown] =
    useState<boolean>(false);

  // Saved entries - loaded from database
  const [savedEntries, setSavedEntries] = useState<DataEntry[]>([]);

  // Inline editing state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Partial<DataEntry>>({});

  // Metrics section state
  const [metricsExpanded, setMetricsExpanded] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<MetricField[]>([
    { id: 'fatturato', label: 'Fatturato mensile', value: '', lastValue: '-' },
    {
      id: 'saldo-conto',
      label: 'Saldo conto fine mese',
      value: '',
      lastValue: '-',
    },
    {
      id: 'crediti-pendenti',
      label: 'Crediti pendenti fine mese',
      value: '',
      lastValue: '-',
    },
    {
      id: 'crediti-scaduti',
      label: 'Crediti scaduti fine mese',
      value: '',
      lastValue: '-',
    },
    {
      id: 'debiti-pendenti',
      label: 'Debiti pendenti fine mese',
      value: '',
      lastValue: '-',
    },
    {
      id: 'debiti-scaduti',
      label: 'Debiti scaduti fine mese',
      value: '',
      lastValue: '-',
    },
  ]);

  // Get available tipologie
  const availableTipologie = useMemo(
    () => causaliCatalog.map(group => group.macroCategory),
    [causaliCatalog]
  );

  // Get available categorie based on selected tipologia
  const availableCategorie = useMemo(() => {
    if (!tipologiaCausale) {
      // If no tipologia selected, show all categories from all tipologie
      return causaliCatalog.flatMap(group =>
        group.categories.map(cat => cat.name)
      );
    }
    const group = causaliCatalog.find(
      g => g.macroCategory === tipologiaCausale
    );
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

    const group = causaliCatalog.find(
      g => g.macroCategory === tipologiaCausale
    );
    if (!group) return [];

    if (!categoria) {
      // If no categoria selected, show all causali from the tipologia
      return group.categories.flatMap(cat => cat.items);
    }

    // Show only causali from the selected categoria
    const selectedCategory = group.categories.find(
      cat => cat.name === categoria
    );
    return selectedCategory?.items || [];
  }, [causaliCatalog, tipologiaCausale, categoria]);

  // Filter causali based on search term
  const filteredCausali = useMemo(() => {
    if (!causaleSearchTerm.trim()) {
      return availableCausali;
    }

    return availableCausali.filter(causaleItem =>
      causaleItem.toLowerCase().includes(causaleSearchTerm.toLowerCase())
    );
  }, [availableCausali, causaleSearchTerm]);

  // Month names in Italian
  const monthNames = [
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

  // Load existing data from database on component mount
  useEffect(() => {
    const loadExistingData = async () => {
      if (!currentLocation?.id || !token) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/data-entries/${currentLocation.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const entries = await response.json();
          setSavedEntries(
            entries.map((entry: any) => ({
              id: entry.id,
              dataInserimento: entry.data_inserimento,
              mese: entry.mese,
              anno: entry.anno,
              tipologiaCausale: entry.tipologia_causale,
              categoria: entry.categoria,
              causale: entry.causale,
              valore: entry.valore,
            }))
          );
        }
      } catch (error) {
        console.error('Error loading data entries:', error);
        showNotification(
          'Errore nel caricamento delle righe registrate',
          'error'
        );
      }
    };

    loadExistingData();
  }, [currentLocation?.id, token, showNotification]);

  // Load last values from monthlyMetrics
  useEffect(() => {
    if (monthlyMetrics.length === 0) return;

    // Find last value for each metric
    const getLastValue = (metricId: string): string => {
      // Find most recent metric entry for this metric
      const relevantMetrics = monthlyMetrics
        .filter(m => m.values && m.values[metricId] !== undefined)
        .sort((a, b) => {
          // Sort by year and month (most recent first)
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });

      if (relevantMetrics.length > 0) {
        const value = relevantMetrics[0].values[metricId];
        return value !== null && value !== undefined
          ? formatItalianNumber(value)
          : '-';
      }
      return '-';
    };

    setMetrics(prev =>
      prev.map(metric => ({
        ...metric,
        lastValue: getLastValue(metric.id),
      }))
    );
  }, [monthlyMetrics]);

  // Update mese and anno when previous month changes
  useEffect(() => {
    setMese(getPreviousMonth.monthIndex);
    setAnno(getPreviousMonth.year);
  }, [getPreviousMonth]);

  // Format current date for display
  const currentDate = format(new Date(), 'dd/MM/yyyy HH:mm');

  // Auto-completion logic
  const handleTipologiaChange = (value: string) => {
    setTipologiaCausale(value);
    setCategoria('');
    setCausale('');
    setCausaleSearchTerm('');
    setShowCausaleDropdown(false);
  };

  const handleCategoriaChange = (value: string) => {
    setCategoria(value);
    setCausale('');
    setCausaleSearchTerm('');
    setShowCausaleDropdown(false);

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
    setCausaleSearchTerm(value);
    setShowCausaleDropdown(false);

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
          const category = group.categories.find(cat =>
            cat.items.includes(value)
          );
          if (category) {
            setCategoria(category.name);
          }
        }
      }
    }
  };

  const handleCausaleSearchChange = (value: string) => {
    setCausaleSearchTerm(value);
    setShowCausaleDropdown(true);

    // If exact match found, select it
    const exactMatch = availableCausali.find(
      causaleItem => causaleItem.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch) {
      setCausale(exactMatch);
    } else {
      setCausale('');
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

    if (!currentLocation?.id || !token) {
      showNotification('Errore di autenticazione.', 'error');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/data-entries/${currentLocation.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dataInserimento: currentDate,
            mese: mese,
            anno: anno,
            tipologiaCausale: tipologiaCausale,
            categoria: categoria,
            causale: causale,
            valore: numericValue,
          }),
        }
      );

      if (response.ok) {
        showNotification('Riga salvata con successo.', 'success');

        // Reset form
        setValore('0,00');
        setCausale('');
        setCategoria('');
        setTipologiaCausale('');
        setCausaleSearchTerm('');
        setShowCausaleDropdown(false);

        // Reload entries
        const loadResponse = await fetch(
          `${API_BASE_URL}/api/data-entries/${currentLocation.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (loadResponse.ok) {
          const entries = await loadResponse.json();
          setSavedEntries(
            entries.map((entry: any) => ({
              id: entry.id,
              dataInserimento: entry.data_inserimento,
              mese: entry.mese,
              anno: entry.anno,
              tipologiaCausale: entry.tipologia_causale,
              categoria: entry.categoria,
              causale: entry.causale,
              valore: entry.valore,
            }))
          );
        }
      } else {
        showNotification('Errore nel salvataggio della riga.', 'error');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      showNotification('Errore nel salvataggio della riga.', 'error');
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentLocation?.id || !token) {
      showNotification('Errore di autenticazione.', 'error');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/data-entries/${currentLocation.id}/${entryId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        showNotification('Riga eliminata con successo.', 'success');

        // Reload entries
        const loadResponse = await fetch(
          `${API_BASE_URL}/api/data-entries/${currentLocation.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (loadResponse.ok) {
          const entries = await loadResponse.json();
          setSavedEntries(
            entries.map((entry: any) => ({
              id: entry.id,
              dataInserimento: entry.data_inserimento,
              mese: entry.mese,
              anno: entry.anno,
              tipologiaCausale: entry.tipologia_causale,
              categoria: entry.categoria,
              causale: entry.causale,
              valore: entry.valore,
            }))
          );
        }
      } else {
        showNotification("Errore nell'eliminazione della riga.", 'error');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      showNotification("Errore nell'eliminazione della riga.", 'error');
    }
  };

  // Edit entry - start inline editing
  const handleEditEntry = (entry: DataEntry) => {
    setEditingEntryId(entry.id);
    setEditingValues({
      mese: entry.mese,
      anno: entry.anno,
      tipologiaCausale: entry.tipologiaCausale,
      categoria: entry.categoria,
      causale: entry.causale,
      valore: entry.valore,
    });
  };

  // Save inline edit
  const handleSaveEdit = async (entryId: string) => {
    if (!currentLocation?.id || !token || !editingValues) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/data-entries/${currentLocation.id}/${entryId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dataInserimento: currentDate,
            mese: editingValues.mese,
            anno: editingValues.anno,
            tipologiaCausale: editingValues.tipologiaCausale,
            categoria: editingValues.categoria,
            causale: editingValues.causale,
            valore: editingValues.valore,
          }),
        }
      );

      if (response.ok) {
        showNotification('Riga modificata con successo', 'success');

        // Clear editing state
        setEditingEntryId(null);
        setEditingValues({});

        // Reload entries
        const loadResponse = await fetch(
          `${API_BASE_URL}/api/data-entries/${currentLocation.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (loadResponse.ok) {
          const entries = await loadResponse.json();
          setSavedEntries(
            entries.map((entry: any) => ({
              id: entry.id,
              dataInserimento: entry.data_inserimento,
              mese: entry.mese,
              anno: entry.anno,
              tipologiaCausale: entry.tipologia_causale,
              categoria: entry.categoria,
              causale: entry.causale,
              valore: entry.valore,
            }))
          );
        }
      } else {
        showNotification('Errore nella modifica della riga', 'error');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      showNotification('Errore durante la modifica della riga', 'error');
    }
  };

  // Cancel inline edit
  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditingValues({});
  };

  // Handle metrics field change
  const handleMetricChange = (id: string, value: string) => {
    setMetrics(prev =>
      prev.map(metric => (metric.id === id ? { ...metric, value } : metric))
    );
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
        values: metrics.reduce(
          (acc, metric) => {
            const numericValue = parseItalianNumber(metric.value);
            acc[metric.id] = numericValue;
            return acc;
          },
          {} as Record<string, number>
        ),
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
          <h2 className="text-lg font-semibold text-gray-900">
            Inserisci metriche mensili
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Prossimo mese proposto: {monthNames[mese].toLowerCase()} {anno}
            </span>
            <span className="text-sm text-gray-500 hover:text-gray-700">
              {metricsExpanded ? 'Nascondi' : 'Mostra'}
            </span>
          </div>
        </div>

        {metricsExpanded && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {metrics.map(metric => (
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
                    onChange={e =>
                      handleMetricChange(metric.id, e.target.value)
                    }
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Registro inserimenti
          </h3>
          <p className="text-sm text-gray-600">
            Inserisci una nuova riga per aggiornare il piano mensile.
          </p>
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
                onChange={e => setMese(Number(e.target.value))}
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
                onChange={e => setAnno(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() - 2 + i
                ).map(year => (
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
                onChange={e => handleTipologiaChange(e.target.value)}
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
                onChange={e => handleCategoriaChange(e.target.value)}
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
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                CAUSALE
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={causaleSearchTerm}
                  onChange={e => handleCausaleSearchChange(e.target.value)}
                  onFocus={() => setShowCausaleDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowCausaleDropdown(false), 200)
                  }
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Cerca o seleziona causale..."
                />
                {showCausaleDropdown && filteredCausali.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCausali.map(causaleItem => (
                      <div
                        key={causaleItem}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        onMouseDown={() => handleCausaleChange(causaleItem)}
                      >
                        {causaleItem}
                      </div>
                    ))}
                  </div>
                )}
                {showCausaleDropdown &&
                  filteredCausali.length === 0 &&
                  causaleSearchTerm.trim() && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Nessuna causale trovata
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* VALORE */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                VALORE
              </label>
              <input
                type="text"
                value={valore}
                onChange={e => handleValoreChange(e.target.value)}
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
              <span className="text-xs text-gray-500 mt-1">
                Righe salvate in basso
              </span>
            </div>
          </div>
        </div>

        {/* Saved entries */}
        {savedEntries.length > 0 && (
          <div className="space-y-2">
            {savedEntries
              .sort(
                (a, b) =>
                  new Date(b.dataInserimento).getTime() -
                  new Date(a.dataInserimento).getTime()
              )
              .map(entry => {
                const isEditing = editingEntryId === entry.id;
                const currentValues = isEditing ? editingValues : entry;

                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-7 gap-4 items-center">
                      <div className="text-sm text-gray-600">
                        {entry.dataInserimento}
                      </div>
                      <div className="text-sm text-gray-600">
                        {isEditing ? (
                          <select
                            value={currentValues.mese}
                            onChange={e =>
                              setEditingValues(prev => ({
                                ...prev,
                                mese: Number(e.target.value),
                              }))
                            }
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {monthNames.map((month, index) => (
                              <option key={index} value={index}>
                                {month}
                              </option>
                            ))}
                          </select>
                        ) : (
                          `${monthNames[entry.mese].toLowerCase()} ${entry.anno}`
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {isEditing ? (
                          <select
                            value={currentValues.anno}
                            onChange={e =>
                              setEditingValues(prev => ({
                                ...prev,
                                anno: Number(e.target.value),
                              }))
                            }
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {Array.from(
                              { length: 5 },
                              (_, i) => new Date().getFullYear() - 2 + i
                            ).map(year => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        ) : (
                          entry.tipologiaCausale
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {isEditing ? (
                          <select
                            value={currentValues.tipologiaCausale}
                            onChange={e =>
                              setEditingValues(prev => ({
                                ...prev,
                                tipologiaCausale: e.target.value,
                              }))
                            }
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Seleziona tipologia</option>
                            {availableTipologie.map(tipologia => (
                              <option key={tipologia} value={tipologia}>
                                {tipologia}
                              </option>
                            ))}
                          </select>
                        ) : (
                          entry.categoria
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {isEditing ? (
                          <select
                            value={currentValues.categoria}
                            onChange={e =>
                              setEditingValues(prev => ({
                                ...prev,
                                categoria: e.target.value,
                              }))
                            }
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Seleziona categoria</option>
                            {availableCategorie.map(categoriaItem => (
                              <option key={categoriaItem} value={categoriaItem}>
                                {categoriaItem}
                              </option>
                            ))}
                          </select>
                        ) : (
                          entry.causale
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formatItalianNumber(
                              currentValues.valore || 0
                            )}
                            onChange={e => {
                              const numericValue = parseItalianNumber(
                                e.target.value
                              );
                              setEditingValues(prev => ({
                                ...prev,
                                valore: numericValue,
                              }));
                            }}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          />
                        ) : (
                          `${formatItalianNumber(entry.valore)} €`
                        )}
                      </div>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(entry.id)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Salva
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                            >
                              Annulla
                            </button>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
