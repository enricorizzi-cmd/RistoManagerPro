// Business Plan Form Component
// Manages business plan form and calculations

import React from 'react';
import { formatCurrencyValue, parseNumberInput } from '../../utils/financialPlanUtils';
import type { BusinessPlanFormState, BusinessPlanMessage } from '../../utils/businessPlanLogic';

interface BusinessPlanFormProps {
  businessPlanForm: BusinessPlanFormState | null;
  businessPlanMessage: BusinessPlanMessage | null;
  completeYears: number[];
  availableYears: number[];
  onFieldChange: (
    field:
      | 'fatturatoIncrement'
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
}

export const BusinessPlanForm: React.FC<BusinessPlanFormProps> = ({
  businessPlanForm,
  businessPlanMessage,
  completeYears,
  availableYears,
  onFieldChange,
  onBaseYearChange,
  onTargetYearChange,
  onSaveDraft,
  onApplyToOverrides,
  onReset,
}) => {
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
      <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
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
              Incremento fatturato (%)
            </label>
            <input
              type="text"
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
              readOnly
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm"
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
          <div className="grid gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Incidenza incassato / fatturato (%)
              </label>
              <input
                type="text"
                value={businessPlanForm.incassatoPercent}
                onChange={(event) => onFieldChange('incassatoPercent', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Costi fissi</h3>
          <div className="grid gap-4">
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
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Costi variabili</h3>
          <div className="grid gap-4">
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
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Utile</h3>
          <div className="grid gap-4">
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

      <div className="flex flex-wrap gap-3">
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
    </div>
  );
};
