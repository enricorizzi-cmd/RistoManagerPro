// Business Plan Form Component
// Manages business plan form and calculations

import React from 'react';
import {
  formatCurrencyValue,
  parseNumberInput,
  buildMonthKey,
} from '../../utils/financialPlanUtils';
import { useAppContext } from '../../contexts/AppContext';
import { calculateFatturatoTotale } from '../../services/financialPlanApi';
import {
  getIncassatoTotal,
  getCostiFissiTotal,
  getCostiVariabiliTotal,
} from '../../utils/financialCalculations';
import type {
  BusinessPlanFormState,
  BusinessPlanMessage,
} from '../../utils/businessPlanLogic';

interface BusinessPlanFormProps {
  businessPlanForm: BusinessPlanFormState | null;
  businessPlanMessage: BusinessPlanMessage | null;
  completeYears: number[];
  availableYears: number[];
  businessPlanDrafts: any[];
  yearMetrics: Map<number, any>;
  causaliCatalog: any[];
  planYear: any;
  getPlanConsuntivoValue: (
    _macro: string,
    _category: string,
    _detail: string,
    _year: number,
    _monthIndex: number
  ) => number;
  financialStatsRows: any[];
  statsOverrides: any;
  draftName: string;
  setDraftName: (name: string) => void;
  onFieldChange: (
    _field:
      | 'fatturatoIncrement'
      | 'fatturatoValue'
      | 'incassatoPercent'
      | 'incassatoValue'
      | 'costiFissiPercent'
      | 'costiFissiValue'
      | 'costiVariabiliPercent'
      | 'costiVariabiliValue',
    _value: string
  ) => void;
  onBaseYearChange: (_year: number) => void;
  onTargetYearChange: (_value: string) => void;
  onSaveDraft: () => void;
  onApplyToOverrides: () => Promise<void>;
  onReset: () => Promise<void>;
  onDeleteDraft: (_draftId: string) => void;
  onRecalculate?: () => void;
  onLoadDraft?: (_draftData: any) => void;
  isLoading?: boolean;
}

export const BusinessPlanForm: React.FC<BusinessPlanFormProps> = ({
  businessPlanForm,
  businessPlanMessage,
  completeYears,
  availableYears,
  businessPlanDrafts,
  yearMetrics: _yearMetrics,
  causaliCatalog,
  planYear,
  getPlanConsuntivoValue,
  financialStatsRows: _financialStatsRows,
  statsOverrides,
  draftName,
  setDraftName,
  onFieldChange,
  onBaseYearChange,
  onTargetYearChange,
  onSaveDraft,
  onApplyToOverrides,
  onReset,
  onDeleteDraft,
  onRecalculate,
  onLoadDraft,
  isLoading = false,
}) => {
  const { currentLocation } = useAppContext();
  const [showMissingDataModal, setShowMissingDataModal] = React.useState(false);

  // Close modal on ESC key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMissingDataModal) {
        setShowMissingDataModal(false);
      }
    };
    if (showMissingDataModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showMissingDataModal]);

  // Automatic calculation of fatturato totale when component mounts or location changes
  React.useEffect(() => {
    const autoCalculateFatturatoTotale = async () => {
      if (!currentLocation?.id) {
        return;
      }

      try {
        await calculateFatturatoTotale(currentLocation.id);
      } catch (error) {
        // Silently handle error
      }
    };

    autoCalculateFatturatoTotale();
  }, [currentLocation?.id]);

  // Funzione per calcolare i dati mancanti per l'anno base selezionato usando gli stessi dati di AnalisiFP
  const getMissingDataForBaseYear = React.useMemo(() => {
    if (!businessPlanForm?.baseYear || !causaliCatalog || !planYear)
      return { hasMissingData: false, missingMonths: [] };

    const missingMonths: number[] = [];
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

    // Helper function per ottenere il fatturato dal database
    const getFatturatoFromStats = (year: number, monthIndex: number) => {
      const monthKey = buildMonthKey(year, monthIndex);

      // Usa sempre fatturatoTotale direttamente da statsOverrides (non fatturatoImponibile)
      const fatturatoTotale =
        statsOverrides[`${monthKey}|fatturatoTotale`] ?? null;

      if (fatturatoTotale !== null) {
        return fatturatoTotale;
      }

      // Ultimo fallback: calcola da componenti solo se fatturatoTotale non è disponibile
      const corrispettivi = statsOverrides[`${monthKey}|corrispettivi`] ?? 0;
      const fatturatoImponibile =
        statsOverrides[`${monthKey}|fatturatoImponibile`] ?? 0;

      return fatturatoImponibile + corrispettivi;
    };

    // Verifica i dati mensili per ogni mese usando le stesse funzioni di AnalisiFP
    for (let i = 0; i < 12; i++) {
      const incassato = getIncassatoTotal(
        causaliCatalog,
        planYear,
        getPlanConsuntivoValue,
        businessPlanForm.baseYear,
        i
      );
      const costiFissi = getCostiFissiTotal(
        causaliCatalog,
        planYear,
        getPlanConsuntivoValue,
        businessPlanForm.baseYear,
        i
      );
      const costiVariabili = getCostiVariabiliTotal(
        causaliCatalog,
        planYear,
        getPlanConsuntivoValue,
        businessPlanForm.baseYear,
        i
      );
      const fatturato = getFatturatoFromStats(businessPlanForm.baseYear, i);

      const hasIncassato =
        incassato !== null && incassato !== undefined && incassato > 0;
      const hasCostiFissi =
        costiFissi !== null && costiFissi !== undefined && costiFissi > 0;
      const hasCostiVariabili =
        costiVariabili !== null &&
        costiVariabili !== undefined &&
        costiVariabili > 0;
      const hasFatturato =
        fatturato !== null && fatturato !== undefined && fatturato > 0;

      if (
        !hasIncassato ||
        !hasCostiFissi ||
        !hasCostiVariabili ||
        !hasFatturato
      ) {
        missingMonths.push(i);
      }
    }

    return {
      hasMissingData: missingMonths.length > 0,
      missingMonths: missingMonths.map(monthIndex => {
        const incassato = getIncassatoTotal(
          causaliCatalog,
          planYear,
          getPlanConsuntivoValue,
          businessPlanForm.baseYear,
          monthIndex
        );
        const costiFissi = getCostiFissiTotal(
          causaliCatalog,
          planYear,
          getPlanConsuntivoValue,
          businessPlanForm.baseYear,
          monthIndex
        );
        const costiVariabili = getCostiVariabiliTotal(
          causaliCatalog,
          planYear,
          getPlanConsuntivoValue,
          businessPlanForm.baseYear,
          monthIndex
        );
        const fatturato = getFatturatoFromStats(
          businessPlanForm.baseYear,
          monthIndex
        );

        return {
          monthIndex,
          monthName: monthNames[monthIndex],
          missingFields: [
            incassato === 0 ? 'Incassato' : null,
            costiFissi === 0 ? 'Costi Fissi' : null,
            costiVariabili === 0 ? 'Costi Variabili' : null,
            fatturato === 0 ? 'Fatturato' : null,
          ].filter(Boolean),
        };
      }),
    };
  }, [
    businessPlanForm?.baseYear,
    causaliCatalog,
    getPlanConsuntivoValue,
    planYear,
    statsOverrides,
  ]);

  if (!businessPlanForm) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Inserisci almeno un anno completo per utilizzare il Business Plan.
        </p>
      </div>
    );
  }

  const baseYearOptions =
    completeYears.length > 0 ? completeYears : availableYears;

  return (
    <div className="space-y-6">
      {/* Alert Dati Mancanti */}
      {getMissingDataForBaseYear.hasMissingData && (
        <div className="flex justify-end">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 max-w-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-amber-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-amber-800">
                    Dati mancanti per {businessPlanForm.baseYear}
                  </p>
                  <p className="text-xs text-amber-700">
                    {getMissingDataForBaseYear.missingMonths.length} mesi
                    incompleti
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

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Business Plan
            </h2>
            <p className="text-gray-600">
              Configurazione previsionale per l&apos;anno{' '}
              {businessPlanForm.targetYear}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-200">
              <label className="block text-xs font-semibold uppercase text-blue-600 mb-1">
                Anno Base
              </label>
              <select
                value={businessPlanForm.baseYear ?? ''}
                onChange={event => onBaseYearChange(Number(event.target.value))}
                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {baseYearOptions.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-200">
              <label className="block text-xs font-semibold uppercase text-blue-600 mb-1">
                Anno Target
              </label>
              <input
                type="number"
                value={businessPlanForm.targetYear}
                onChange={event => onTargetYearChange(event.target.value)}
                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button
              type="button"
              onClick={onRecalculate}
              className="rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Ricalcola
            </button>
          </div>
        </div>
        {businessPlanMessage && (
          <div
            className={`rounded-xl px-4 py-3 text-sm border ${
              businessPlanMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : businessPlanMessage.type === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}
          >
            {businessPlanMessage.text}
          </div>
        )}
      </div>

      {/* Fatturato Section - Full Width */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Fatturato</h3>
          <div className="w-3 h-3 rounded-full bg-blue-100"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fatturato anno base
            </label>
            <input
              type="text"
              value={formatCurrencyValue(
                parseNumberInput(businessPlanForm.fatturatoAnnoBase)
              )}
              readOnly
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white text-gray-600 font-semibold"
            />
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <label className="block text-sm font-semibold text-blue-700 mb-2">
              Incremento fatturato (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={businessPlanForm.fatturatoIncrement}
              onChange={event =>
                onFieldChange('fatturatoIncrement', event.target.value)
              }
              onBlur={() => onRecalculate?.()}
              className="w-full rounded-lg border border-blue-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
            />
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <label className="block text-sm font-semibold text-emerald-700 mb-2">
              Fatturato previsionale
            </label>
            <input
              type="text"
              value={businessPlanForm.fatturatoPrevisionale}
              onChange={event =>
                onFieldChange('fatturatoValue', event.target.value)
              }
              onBlur={() => onRecalculate?.()}
              className="w-full rounded-lg border border-emerald-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Macro Categories Grid 2x2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Incassato Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Incassato</h3>
            <div className="w-3 h-3 rounded-full bg-green-100"></div>
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Incassato anno base
              </label>
              <input
                type="text"
                value={formatCurrencyValue(
                  parseNumberInput(businessPlanForm.incassatoAnnoBase || '0')
                )}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white text-gray-600 font-semibold"
              />
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <label className="block text-sm font-semibold text-green-700 mb-2">
                Incassato previsionale
              </label>
              <input
                type="text"
                value={businessPlanForm.incassatoPrevisionale}
                onChange={event =>
                  onFieldChange('incassatoValue', event.target.value)
                }
                onBlur={() => onRecalculate?.()}
                className="w-full rounded-lg border border-green-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white font-semibold"
              />
            </div>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Incidenza anno base (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.incassatoPercentAnnoBase || '0.00'}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white text-gray-600 font-semibold"
              />
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <label className="block text-sm font-semibold text-blue-700 mb-2">
                Incidenza previsionale (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.incassatoPercent}
                onChange={event =>
                  onFieldChange('incassatoPercent', event.target.value)
                }
                onBlur={() => onRecalculate?.()}
                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Costi Fissi Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Costi Fissi</h3>
            <div className="w-3 h-3 rounded-full bg-orange-100"></div>
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Costi fissi anno base
              </label>
              <input
                type="text"
                value={formatCurrencyValue(
                  parseNumberInput(businessPlanForm.costiFissiAnnoBase || '0')
                )}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white text-gray-600 font-semibold"
              />
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <label className="block text-sm font-semibold text-orange-700 mb-2">
                Costi fissi previsionali
              </label>
              <input
                type="text"
                value={businessPlanForm.costiFissiPrevisionale}
                onChange={event =>
                  onFieldChange('costiFissiValue', event.target.value)
                }
                onBlur={() => onRecalculate?.()}
                className="w-full rounded-lg border border-orange-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white font-semibold"
              />
            </div>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Incidenza anno base (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiFissiPercentAnnoBase || '0.00'}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white text-gray-600 font-semibold"
              />
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <label className="block text-sm font-semibold text-blue-700 mb-2">
                Incidenza previsionale (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiFissiPercent}
                onChange={event =>
                  onFieldChange('costiFissiPercent', event.target.value)
                }
                onBlur={() => onRecalculate?.()}
                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Costi Variabili Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Costi Variabili</h3>
            <div className="w-3 h-3 rounded-full bg-red-100"></div>
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Costi variabili anno base
              </label>
              <input
                type="text"
                value={formatCurrencyValue(
                  parseNumberInput(
                    businessPlanForm.costiVariabiliAnnoBase || '0'
                  )
                )}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white text-gray-600 font-semibold"
              />
            </div>
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <label className="block text-sm font-semibold text-red-700 mb-2">
                Costi variabili previsionali
              </label>
              <input
                type="text"
                value={businessPlanForm.costiVariabiliPrevisionale}
                onChange={event =>
                  onFieldChange('costiVariabiliValue', event.target.value)
                }
                onBlur={() => onRecalculate?.()}
                className="w-full rounded-lg border border-red-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-semibold"
              />
            </div>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Incidenza anno base (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiVariabiliPercentAnnoBase || '0.00'}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white text-gray-600 font-semibold"
              />
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <label className="block text-sm font-semibold text-blue-700 mb-2">
                Incidenza previsionale (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.costiVariabiliPercent}
                onChange={event =>
                  onFieldChange('costiVariabiliPercent', event.target.value)
                }
                onBlur={() => onRecalculate?.()}
                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Utile Section */}
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Utile</h3>
            <div className="w-3 h-3 rounded-full bg-emerald-200"></div>
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm">
              <p className="text-sm font-semibold text-gray-600 mb-2">
                Utile anno base
              </p>
              <p className="text-xl font-bold text-gray-800">
                {formatCurrencyValue(
                  parseNumberInput(businessPlanForm.utileAnnoBase || '0')
                )}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm">
              <p className="text-sm font-semibold text-gray-600 mb-2">
                Incidenza anno base (%)
              </p>
              <p className="text-xl font-bold text-gray-800">
                {parseNumberInput(
                  businessPlanForm.utilePercentAnnoBase || '0'
                )?.toFixed(2) ?? '0.00'}
                %
              </p>
            </div>
            <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-xl p-4 border border-emerald-300 shadow-sm">
              <p className="text-sm font-semibold text-emerald-800 mb-2">
                Utile previsionale
              </p>
              <p className="text-2xl font-bold text-emerald-900">
                {formatCurrencyValue(
                  parseNumberInput(businessPlanForm.utilePrevisionale)
                )}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm">
              <p className="text-sm font-semibold text-gray-600 mb-2">
                Incidenza previsionale (%)
              </p>
              <p className="text-xl font-bold text-emerald-700">
                {parseNumberInput(businessPlanForm.utilePercent)?.toFixed(2) ??
                  '0.00'}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campo Nome Bozza */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Gestione Bozze</h3>
          <div className="w-3 h-3 rounded-full bg-purple-200"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-purple-700 mb-2">
              Nome Bozza
            </label>
            <input
              type="text"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="Inserisci un nome per la bozza..."
              className="w-full rounded-xl border border-purple-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
            />
          </div>
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={!draftName.trim() || isLoading}
              className="rounded-xl bg-purple-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Salva previsionale
            </button>
          </div>
        </div>
      </div>

      {/* Lista Bozze Salvate */}
      {businessPlanDrafts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Bozze Salvate</h3>
            <div className="w-3 h-3 rounded-full bg-gray-200"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {businessPlanDrafts.map(draft => (
              <div
                key={draft.id}
                className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-base text-gray-900 mb-1">
                      {draft.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      Anno {draft.targetYear}
                    </div>
                    <div className="text-xs text-gray-500">
                      Salvato il{' '}
                      {new Date(draft.createdAt).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Carica la bozza nel form
                      onLoadDraft?.(draft.data);
                    }}
                    className="flex-1 rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    Carica
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDraft(draft.id)}
                    className="flex-1 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 transition-colors"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Azioni</h3>
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={onRecalculate}
            className="rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Ricalcola
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!draftName.trim()) {
                alert(
                  'Inserisci un nome per la bozza prima di salvare e inserire il previsionale.'
                );
                return;
              }
              await onSaveDraft();
              await onApplyToOverrides();
            }}
            disabled={!draftName.trim() || isLoading}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isLoading && (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {!isLoading && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            )}
            {isLoading ? 'Elaborazione...' : 'Salva e inserisci previsionale'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onReset();
            }}
            disabled={isLoading}
            className="rounded-xl bg-slate-200 px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-slate-300 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isLoading && (
              <svg
                className="animate-spin h-5 w-5 text-gray-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {!isLoading && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            {isLoading ? 'Elaborazione...' : 'Reset previsionale'}
          </button>
        </div>
      </div>

      {/* Modal Dettagli Dati Mancanti */}
      {showMissingDataModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-70 transition-opacity"
              onClick={() => setShowMissingDataModal(false)}
              role="button"
              tabIndex={0}
              aria-label="Chiudi modal"
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setShowMissingDataModal(false);
                }
              }}
            ></div>

            <div className="relative z-10 inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-amber-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Dati mancanti per l&apos;anno {businessPlanForm.baseYear}
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-4">
                        Per utilizzare il Business Plan, è necessario compilare
                        tutti i dati per l&apos;anno base selezionato.
                      </p>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {getMissingDataForBaseYear.missingMonths.map(month => (
                          <div
                            key={month.monthIndex}
                            className="border border-gray-200 rounded-lg p-3"
                          >
                            <h4 className="font-medium text-gray-900 mb-2">
                              {month.monthName}
                            </h4>
                            <div className="space-y-1">
                              {month.missingFields.map((field, index) => (
                                <div
                                  key={index}
                                  className="flex items-center text-sm text-gray-600"
                                >
                                  <svg
                                    className="h-4 w-4 text-red-400 mr-2"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                      clipRule="evenodd"
                                    />
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
