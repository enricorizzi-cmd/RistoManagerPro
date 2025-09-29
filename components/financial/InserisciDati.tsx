// Inserisci Dati Component
// Data entry form for monthly financial plan metrics

import React, { useState, useEffect } from 'react';
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
  causale: string;
  valore: number;
}

interface InserisciDatiProps {
  causaliCatalog: FinancialCausaleGroup[];
}

export const InserisciDati: React.FC<InserisciDatiProps> = ({ causaliCatalog }) => {
  const { showNotification } = useAppContext();
  const { setOverride, handleSavePlan } = useFinancialPlanData();
  
  // Form state
  const [mese, setMese] = useState<number>(new Date().getMonth());
  const [anno, setAnno] = useState<number>(new Date().getFullYear());
  const [tipologiaCausale, setTipologiaCausale] = useState<string>('COSTI FISSI');
  const [causale, setCausale] = useState<string>('Compensi Amministratori');
  const [valore, setValore] = useState<string>('0,00');
  
  // Saved entries
  const [savedEntries, setSavedEntries] = useState<DataEntry[]>([]);
  
  // Get available causali for the selected tipologia
  const availableCausali = causaliCatalog
    .find(group => group.macroCategory === tipologiaCausale)
    ?.categories.flatMap(cat => cat.items) || [];

  // Month names in Italian
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Format current date for display
  const currentDate = format(new Date(), 'dd/MM/yyyy HH:mm');

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

    if (!causale.trim()) {
      showNotification('Inserisci una causale.', 'error');
      return;
    }

    try {
      // Create new entry
      const newEntry: DataEntry = {
        id: Date.now().toString(),
        dataInserimento: currentDate,
        mese,
        anno,
        tipologiaCausale,
        causale,
        valore: numericValue
      };

      // Add to saved entries
      setSavedEntries(prev => [newEntry, ...prev]);

      // Update the financial plan data
      const monthKey = buildMonthKey(anno, mese);
      
      // Find the category for this causale
      const category = causaliCatalog
        .find(group => group.macroCategory === tipologiaCausale)
        ?.categories.find(cat => cat.items.includes(causale))?.name || '';

      // Set the override for consuntivo (actual) value
      setOverride('consuntivo', tipologiaCausale, category, causale, anno, mese, numericValue);

      // Save the plan
      await handleSavePlan(anno, new Set([`consuntivo|${tipologiaCausale}|${category}|${causale}|${monthKey}`]));

      showNotification('Riga salvata con successo.', 'success');

      // Reset form but keep month and year
      setValore('0,00');
      setCausale('');

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
      // Remove from saved entries
      setSavedEntries(prev => prev.filter(e => e.id !== entryId));

      // Remove the override (set to null)
      const monthKey = buildMonthKey(entry.anno, entry.mese);
      const category = causaliCatalog
        .find(group => group.macroCategory === entry.tipologiaCausale)
        ?.categories.find(cat => cat.items.includes(entry.causale))?.name || '';

      setOverride('consuntivo', entry.tipologiaCausale, category, entry.causale, entry.anno, entry.mese, null);

      // Save the plan
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
    setCausale(entry.causale);
    setValore(formatItalianNumber(entry.valore));
    
    // Remove the entry from saved entries (user will save it again)
    setSavedEntries(prev => prev.filter(e => e.id !== entry.id));
  };

  return (
    <div className="space-y-6">
      {/* Inserisci metriche mensili section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Inserisci metriche mensili</h2>
          <span className="text-sm text-gray-500">Nessun dato salvato</span>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500">Mostra</span>
        </div>
      </div>

      {/* Registro inserimenti section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Registro inserimenti</h3>
          <p className="text-sm text-gray-600">Inserisci una nuova riga per aggiornare il piano mensile.</p>
        </div>

        {/* Data entry form */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-7 gap-4 items-end">
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
                onChange={(e) => {
                  setTipologiaCausale(e.target.value);
                  setCausale(''); // Reset causale when tipologia changes
                }}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="COSTI FISSI">COSTI FISSI</option>
                <option value="COSTI VARIABILI">COSTI VARIABILI</option>
                <option value="INCASSATO">INCASSATO</option>
              </select>
            </div>

            {/* CAUSALE */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                CAUSALE
              </label>
              <select
                value={causale}
                onChange={(e) => setCausale(e.target.value)}
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
                <div className="grid grid-cols-6 gap-4 items-center">
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
