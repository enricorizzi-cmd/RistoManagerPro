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
  businessPlanDrafts: Record<string, any>;
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
}

export const BusinessPlanForm: React.FC<BusinessPlanFormProps> = ({
  businessPlanForm,
  businessPlanMessage,
  completeYears,
  availableYears,
  businessPlanDrafts,
  onFieldChange,
  onBaseYearChange,
  onTargetYearChange,
  onSaveDraft,
  onApplyToOverrides,
  onReset,
  onDeleteDraft,
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
