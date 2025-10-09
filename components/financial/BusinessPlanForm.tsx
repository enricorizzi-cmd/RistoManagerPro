// Business Plan Form Component
// Manages business plan form and calculations

import React from 'react';
import { formatCurrencyValue, parseNumberInput, buildMonthKey, parsePlanMonthLabel } from '../../utils/financialPlanUtils';
import { getIncassatoTotal, getCostiFissiTotal, getCostiVariabiliTotal, calculateUtileFromMacroTotals } from '../../utils/financialCalculations';
import { useAppContext } from '../../contexts/AppContext';
import { calculateFatturatoTotale } from '../../services/financialPlanApi';
import type { BusinessPlanFormState, BusinessPlanMessage } from '../../utils/businessPlanLogic';

interface BusinessPlanFormProps {
  businessPlanForm: BusinessPlanFormState | null;
  businessPlanMessage: BusinessPlanMessage | null;
  completeYears: number[];
  availableYears: number[];
  businessPlanDrafts: Record<string, any>;
  yearMetrics: Map<number, any>;
  causaliCatalog: any[];
  planYear: any;
  getPlanConsuntivoValue: (macro: string, category: string, detail: string, year: number, monthIndex: number) => number;
  financialStatsRows: any[];
  statsOverrides: any;
  onFieldChange: (
    field:
      | 'fatturatoIncrement'
      | 'fatturatoValue'
      | 'incassatoPercent'
      | 'incassatoValue'
      | 'costiFissiPercent'
      | 'costiFissiValue'
      | 'costiVariabiliPercent'
      | 'costiVariabiliValue',
    value: string,
  ) => void;
  onBaseYearChange: (year: number) => void;
  onTargetYearChange: (value: string) => void;
  onSaveDraft: () => void;
  onApplyToOverrides: () => void;
  onReset: () => void;
  onDeleteDraft: (targetYear: number) => void;
  onRecalculate?: () => void;
}

export const BusinessPlanForm: React.FC<BusinessPlanFormProps> = ({
  businessPlanForm,
  businessPlanMessage,
  completeYears,
  availableYears,
  businessPlanDrafts,
  yearMetrics,
  causaliCatalog,
  planYear,
  getPlanConsuntivoValue,
  financialStatsRows,
  statsOverrides,
  onFieldChange,
  onBaseYearChange,
  onTargetYearChange,
  onSaveDraft,
  onApplyToOverrides,
  onReset,
  onDeleteDraft,
  onRecalculate,
}) => {
  const { currentLocation } = useAppContext();
  const [showMissingDataModal, setShowMissingDataModal] = React.useState(false);

  // Automatic calculation of fatturato totale when component mounts or location changes
  React.useEffect(() => {
    const autoCalculateFatturatoTotale = async () => {
      if (!currentLocation?.id) {
        return;
      }

      try {
        await calculateFatturatoTotale(currentLocation.id);
        console.log('✅ Fatturato totale calcolato automaticamente per azienda:', currentLocation.id);
      } catch (error) {
        console.error('❌ Errore durante il calcolo automatico del fatturato totale:', error);
      }
    };

    autoCalculateFatturatoTotale();
  }, [currentLocation?.id]);


  // Funzione per calcolare i dati mancanti per l'anno base selezionato usando gli stessi dati di AnalisiFP
  const getMissingDataForBaseYear = React.useMemo(() => {
    if (!businessPlanForm?.baseYear || !causaliCatalog || !planYear) return { hasMissingData: false, missingMonths: [] };
    
    const missingMonths: number[] = [];
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    
    // Helper function per ottenere il fatturato dal database
    const getFatturatoFromStats = (year: number, monthIndex: number) => {
      const monthKey = buildMonthKey(year, monthIndex);
      
      // First try to get fatturatoTotale directly from statsOverrides (saved by StatsTable)
      const fatturatoTotale = statsOverrides[`${monthKey}|fatturatoTotale`] ?? null;
      
      if (fatturatoTotale !== null) {
        return fatturatoTotale;
      }
      
      // Fallback: calculate from individual components
      const corrispettivi = statsOverrides[`${monthKey}|corrispettivi`] ?? 0; // Default to 0 if missing
      const fatturatoImponibile = statsOverrides[`${monthKey}|fatturatoImponibile`] ?? 0;
      
      return fatturatoImponibile + corrispettivi;
    };
    
    // Verifica i dati mensili per ogni mese usando le stesse funzioni di AnalisiFP
    for (let i = 0; i < 12; i++) {
      const incassato = getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, businessPlanForm.baseYear, i);
      const costiFissi = getCostiFissiTotal(causaliCatalog, planYear, getPlanConsuntivoValue, businessPlanForm.baseYear, i);
      const costiVariabili = getCostiVariabiliTotal(causaliCatalog, planYear, getPlanConsuntivoValue, businessPlanForm.baseYear, i);
      const fatturato = getFatturatoFromStats(businessPlanForm.baseYear, i);
      
      const hasIncassato = incassato !== null && incassato !== undefined && incassato > 0;
      const hasCostiFissi = costiFissi !== null && costiFissi !== undefined && costiFissi > 0;
      const hasCostiVariabili = costiVariabili !== null && costiVariabili !== undefined && costiVariabili > 0;
      const hasFatturato = fatturato !== null && fatturato !== undefined && fatturato > 0;
      
      if (!hasIncassato || !hasCostiFissi || !hasCostiVariabili || !hasFatturato) {
        missingMonths.push(i);
      }
    }
    
    return {
      hasMissingData: missingMonths.length > 0,
      missingMonths: missingMonths.map(monthIndex => {
        const incassato = getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, businessPlanForm.baseYear, monthIndex);
        const costiFissi = getCostiFissiTotal(causaliCatalog, planYear, getPlanConsuntivoValue, businessPlanForm.baseYear, monthIndex);
        const costiVariabili = getCostiVariabiliTotal(causaliCatalog, planYear, getPlanConsuntivoValue, businessPlanForm.baseYear, monthIndex);
        const fatturato = getFatturatoFromStats(businessPlanForm.baseYear, monthIndex);
        
        return {
          monthIndex,
          monthName: monthNames[monthIndex],
          missingFields: [
            incassato === 0 ? 'Incassato' : null,
            costiFissi === 0 ? 'Costi Fissi' : null,
            costiVariabili === 0 ? 'Costi Variabili' : null,
            fatturato === 0 ? 'Fatturato' : null,
          ].filter(Boolean)
        };
      })
    };
  }, [businessPlanForm?.baseYear, causaliCatalog, planYear, getPlanConsuntivoValue, financialStatsRows, statsOverrides]);

  if (!businessPlanForm) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Inserisci almeno un anno completo per utilizzare il Business Plan.
        </p>
      </div>
    );
  }

  const baseYearOptions = completeYears.length > 0 ? completeYears : availableYears;

  return (
    <div className="space-y-6">
      {/* Alert Dati Mancanti */}
      {getMissingDataForBaseYear.hasMissingData && (
        <div className="flex justify-end">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 max-w-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-amber-800">
                    Dati mancanti per {businessPlanForm.baseYear}
                  </p>
                  <p className="text-xs text-amber-700">
                    {getMissingDataForBaseYear.missingMonths.length} mesi incompleti
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMissingDataModal(true)}
                className="ml-4 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                Dettagli
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">
              Anno base
            </label>
            <select
              value={businessPlanForm.baseYear ?? ''}
              onChange={(event) => onBaseYearChange(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {baseYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">
              Anno target
            </label>
            <input
              type="number"
              value={businessPlanForm.targetYear}
              onChange={(event) => onTargetYearChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">
              Fatturato anno base (€)
            </label>
            <input
              type="text"
              value={formatCurrencyValue(parseNumberInput(businessPlanForm.fatturatoAnnoBase))}
              readOnly
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">
              Incremento fatturato (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={businessPlanForm.fatturatoIncrement}
              onChange={(event) => onFieldChange('fatturatoIncrement', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">
              Fatturato previsionale (€)
            </label>
              <input
                type="text"
                value={businessPlanForm.fatturatoPrevisionale}
                onChange={(event) => onFieldChange('fatturatoValue', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
          </div>
        </div>
        {businessPlanMessage && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              businessPlanMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : businessPlanMessage.type === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-sky-50 text-sky-700'
            }`}
          >
            {businessPlanMessage.text}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Incassato</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Incassato anno base (€)
              </label>
              <input
                type="text"
                value={formatCurrencyValue(parseNumberInput(businessPlanForm.incassatoAnnoBase || '0'))}
                readOnly
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Incidenza incassato / fatturato anno base (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.incassatoPercentAnnoBase || '0.00'}
                readOnly
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Incassato previsionale (€)
              </label>
              <input
                type="text"
                value={businessPlanForm.incassatoPrevisionale}
                onChange={(event) => onFieldChange('incassatoValue', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Incidenza incassato / fatturato (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.incassatoPercent}
                onChange={(event) => onFieldChange('incassatoPercent', event.target.value)}
                onBlur={() => onRecalculate?.()}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Costi fissi</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Costi fissi anno base (€)
              </label>
              <input
                type="text"
                value={formatCurrencyValue(parseNumberInput(businessPlanForm.costiFissiAnnoBase || '0'))}
                readOnly
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Incidenza costi fissi / incassato anno base (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiFissiPercentAnnoBase || '0.00'}
                readOnly
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Costi fissi previsionali (€)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiFissiPrevisionale}
                onChange={(event) => onFieldChange('costiFissiValue', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Incidenza costi fissi / incassato (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiFissiPercent}
                onChange={(event) => onFieldChange('costiFissiPercent', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Costi variabili</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Costi variabili anno base (€)
              </label>
              <input
                type="text"
                value={formatCurrencyValue(parseNumberInput(businessPlanForm.costiVariabiliAnnoBase || '0'))}
                readOnly
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Incidenza costi variabili / incassato anno base (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiVariabiliPercentAnnoBase || '0.00'}
                readOnly
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Costi variabili previsionali (€)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiVariabiliPrevisionale}
                onChange={(event) => onFieldChange('costiVariabiliValue', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Incidenza costi variabili / incassato (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiVariabiliPercent}
                onChange={(event) => onFieldChange('costiVariabiliPercent', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Utile</h3>
          <div className="grid gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                Utile anno base (€)
              </p>
              <p className="text-lg font-semibold text-gray-600">
                {formatCurrencyValue(parseNumberInput(businessPlanForm.utileAnnoBase || '0'))}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                Incidenza utile / incassato anno base (%)
              </p>
              <p className="text-lg font-semibold text-gray-600">
                {parseNumberInput(businessPlanForm.utilePercentAnnoBase || '0')?.toFixed(2) ?? '0.00'}%
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                Utile previsionale (€)
              </p>
              <p className="text-2xl font-semibold text-emerald-700">
                {formatCurrencyValue(parseNumberInput(businessPlanForm.utilePrevisionale))}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                Incidenza utile / incassato (%)
              </p>
              <p className="text-lg font-semibold text-gray-800">
                {parseNumberInput(businessPlanForm.utilePercent)?.toFixed(2) ?? '0.00'}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Bozze Salvate */}
      {Object.keys(businessPlanDrafts).length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Bozze Salvate</h3>
          <div className="space-y-2">
            {Object.entries(businessPlanDrafts).map(([targetYear, draft]) => (
              <div key={targetYear} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Previsionale {targetYear}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    (Base: {draft.baseYear}, Creato: {new Date(draft.createdAt).toLocaleDateString()})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteDraft(Number(targetYear))}
                  className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                >
                  Elimina
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRecalculate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Ricalcola
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-600"
        >
          Salva previsionale
        </button>
        <button
          type="button"
          onClick={onApplyToOverrides}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Salva e inserisci previsionale
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-slate-300"
        >
          Reset previsionale
        </button>
      </div>

      {/* Modal Dettagli Dati Mancanti */}
      {showMissingDataModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowMissingDataModal(false)}></div>
            
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Dati mancanti per l'anno {businessPlanForm.baseYear}
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-4">
                        Per utilizzare il Business Plan, è necessario compilare tutti i dati per l'anno base selezionato.
                      </p>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {getMissingDataForBaseYear.missingMonths.map((month) => (
                          <div key={month.monthIndex} className="border border-gray-200 rounded-lg p-3">
                            <h4 className="font-medium text-gray-900 mb-2">{month.monthName}</h4>
                            <div className="space-y-1">
                              {month.missingFields.map((field, index) => (
                                <div key={index} className="flex items-center text-sm text-gray-600">
                                  <svg className="h-4 w-4 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                  {field}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={() => setShowMissingDataModal(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
