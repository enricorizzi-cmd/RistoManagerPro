// Financial Plan Component - Refactored
// Main component orchestrating all financial plan functionality

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useFinancialPlanData } from '../hooks/useFinancialPlanData';
import { useBusinessPlan } from '../hooks/useBusinessPlan';
import { usePlanEditor } from '../hooks/usePlanEditor';
import { FinancialOverview } from './financial/FinancialOverview';
import { PlanTable } from './financial/PlanTable';
import { BusinessPlanForm } from './financial/BusinessPlanForm';
import { StatsTable } from './financial/StatsTable';
import { CausaliManager } from './financial/CausaliManager';
import { financialCausali, financialStats as financialStatsRows } from '../data/financialPlanData';
import { calcRatios, round2, parseNumberInput, buildMonthKey, parseMonthKey } from '../utils/financialPlanUtils';
import type { TabKey } from '../types';

const FinancialPlan: React.FC = () => {
  const { showNotification } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Statistics year range state
  const currentYear = new Date().getFullYear();
  const [statsFromYear, setStatsFromYear] = useState<number>(currentYear - 2);
  const [statsToYear, setStatsToYear] = useState<number>(currentYear);
  const [statsEditMode, setStatsEditMode] = useState<boolean>(false);

  // Custom hooks for data management
  const {
    planOverrides,
    consuntivoOverrides,
    statsOverrides,
    loadingState,
    savingState,
    causaliCatalog,
    basePlanByYear,
    yearMetrics,
    setOverride,
    setStatsOverrides,
    handleSavePlan,
    handleCancelPlan,
    handleCausaliPersist,
    getPlanPreventivoValue,
    getPlanConsuntivoValue,
  } = useFinancialPlanData();

  const {
    businessPlanForm,
    businessPlanMessage,
    availableYears,
    completeYears,
    handleBusinessPlanFieldChange,
    handleBusinessPlanBaseYearChange,
    handleBusinessPlanTargetYearChange,
    handleSaveBusinessPlanDraft,
  } = useBusinessPlan(yearMetrics);

  const {
    editMode,
    onlyValued,
    onlyConsuntivo,
    dirtyKeys,
    enableEditMode,
    disableEditMode,
    clearDirtyKeys,
    addDirtyKey,
    toggleOnlyValued,
    toggleOnlyConsuntivo,
  } = usePlanEditor();

  // Update selected year if not available
  useEffect(() => {
    if (!basePlanByYear.has(selectedYear) && availableYears.length > 0) {
      // If selected year is not available, try to find the closest available year
      const closestYear = availableYears.find(year => basePlanByYear.has(year)) || availableYears[0];
      setSelectedYear(closestYear);
    }
  }, [basePlanByYear, selectedYear, availableYears]);

  const planYear = basePlanByYear.get(selectedYear);

  // Enhanced setOverride with dirty tracking
  const handleSetOverride = (
    target: 'preventivo' | 'consuntivo',
    macro: string,
    category: string,
    detail: string,
    year: number,
    monthIndex: number,
    value: number | null,
  ) => {
    setOverride(target, macro, category, detail, year, monthIndex, value);
    if (!editMode) {
      enableEditMode();
    }
    const monthKey = buildMonthKey(year, monthIndex);
    addDirtyKey(`${target}|${macro}|${category}|${detail}|${monthKey}`);
  };

  // Enhanced save handler
  const handleSave = async () => {
    const success = await handleSavePlan(selectedYear, dirtyKeys);
    if (success) {
      disableEditMode();
      showNotification('Piano mensile salvato con successo.', 'success');
      clearDirtyKeys();
    }
  };

  // Enhanced cancel handler
  const handleCancel = async () => {
    const success = await handleCancelPlan();
    if (success) {
      disableEditMode();
      clearDirtyKeys();
    }
  };

  // Business plan apply to overrides
  const applyBusinessPlanToOverrides = () => {
    if (!businessPlanForm || businessPlanForm.baseYear === null) {
      showNotification('Compila il Business Plan prima di applicare il previsionale.', 'error');
      return;
    }
    const planBase = basePlanByYear.get(businessPlanForm.baseYear);
    const metrics = yearMetrics.get(businessPlanForm.baseYear);
    if (!planBase || !metrics) {
      showNotification('Dati storici insufficienti per l\'anno base selezionato.', 'error');
      return;
    }

    const targetYear = businessPlanForm.targetYear;
    const fatturatoPrevisionale = parseNumberInput(businessPlanForm.fatturatoPrevisionale) ?? metrics.fatturatoTotale;
    const incassatoPrevisionale = parseNumberInput(businessPlanForm.incassatoPrevisionale) ?? metrics.incassato;
    const costiFissiPrevisionale = parseNumberInput(businessPlanForm.costiFissiPrevisionale) ?? metrics.costiFissi;
    const costiVariabiliPrevisionale = parseNumberInput(businessPlanForm.costiVariabiliPrevisionale) ?? metrics.costiVariabili;

    // Filter overrides for target year
    const filterPlanOverridesForYear = (overrides: any, year: number) => {
      const result: any = {};
      Object.entries(overrides).forEach(([macro, categories]: [string, any]) => {
        Object.entries(categories).forEach(([category, details]: [string, any]) => {
          Object.entries(details).forEach(([detail, months]: [string, any]) => {
            Object.entries(months).forEach(([monthKey, value]: [string, any]) => {
              const parsed = parseMonthKey(monthKey);
              if (!parsed || parsed.year === year) {
                return;
              }
              if (!result[macro]) result[macro] = {};
              if (!result[macro][category]) result[macro][category] = {};
              if (!result[macro][category][detail]) result[macro][category][detail] = {};
              result[macro][category][detail][monthKey] = value;
            });
          });
        });
      });
      return result;
    };

    const nextPlanOverrides = filterPlanOverridesForYear(planOverrides, targetYear);

    const macroTargets: Record<string, number> = {
      INCASSATO: incassatoPrevisionale,
      'COSTI FISSI': costiFissiPrevisionale,
      'COSTI VARIABILI': costiVariabiliPrevisionale,
    };

    const macroRatios: Record<string, number[]> = {
      INCASSATO: calcRatios(metrics.monthlyIncassato),
      'COSTI FISSI': calcRatios(metrics.monthlyCostiFissi),
      'COSTI VARIABILI': calcRatios(metrics.monthlyCostiVariabili),
    };

    planBase.macros.forEach((macro) => {
      const macroKey = macro.macro.toUpperCase();
      if (!macroTargets[macroKey]) {
        return;
      }
      const macroTotalBase = macro.details
        .map((detail) =>
          detail.months.reduce((acc, month) => acc + (month.consuntivo ?? 0), 0),
        )
        .reduce((acc, value) => acc + value, 0);

      macro.details.forEach((detail) => {
        const detailSum = detail.months.reduce(
          (acc, month) => acc + (month.consuntivo ?? 0),
          0,
        );
        const detailShare = macroTotalBase === 0 ? 0 : detailSum / macroTotalBase;
        const annualTarget = round2(macroTargets[macroKey] * detailShare);
        const detailRatios =
          detailSum === 0
            ? macroRatios[macroKey]
            : detail.months.map((month) =>
                detailSum === 0 ? 0 : (month.consuntivo ?? 0) / detailSum,
              );
        (detailRatios ?? new Array(12).fill(1 / 12)).forEach((ratio, monthIndex) => {
          const monthValue = round2(annualTarget * ratio);
          if (!nextPlanOverrides[detail.macro]) {
            nextPlanOverrides[detail.macro] = {};
          }
          if (!nextPlanOverrides[detail.macro][detail.category]) {
            nextPlanOverrides[detail.macro][detail.category] = {};
          }
          if (!nextPlanOverrides[detail.macro][detail.category][detail.detail]) {
            nextPlanOverrides[detail.macro][detail.category][detail.detail] = {};
          }
          const monthKey = buildMonthKey(new Date().getFullYear(), monthIndex);
          nextPlanOverrides[detail.macro][detail.category][detail.detail][monthKey] = monthValue;
        });
      });
    });

    showNotification(`Previsionale ${targetYear} applicato e salvato.`, 'success');
  };

  const handleResetBusinessPlan = () => {
    if (!businessPlanForm) {
      return;
    }
    const targetYear = businessPlanForm.targetYear;
    showNotification(`Previsionale ${targetYear} ripristinato.`, 'info');
  };

  const handleCausaliPersistWithNotification = async (causali: any[]) => {
    const success = await handleCausaliPersist(causali);
    if (success) {
      showNotification('Catalogo causali aggiornato.', 'success');
    }
  };

  // Statistics override handler
  const handleStatsOverride = (monthKey: string, field: string, value: number | null) => {
    const overrideKey = `${monthKey}|${field}`;
    setStatsOverrides(prev => ({
      ...prev,
      [overrideKey]: value
    }));
  };

  const tabs = [
    { key: 'overview', label: 'Panoramica' },
    { key: 'plan', label: 'Piano Mensile' },
    { key: 'causali', label: 'Causali' },
    { key: 'business-plan', label: 'Business Plan' },
    { key: 'stats', label: 'Statistiche' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <FinancialOverview 
          planYear={planYear} 
          selectedYear={selectedYear}
          availableYears={availableYears}
          onYearChange={setSelectedYear}
        />
      )}

      {activeTab === 'plan' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase text-gray-500">
              Anno
            </label>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <label className="ml-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={onlyValued}
                onChange={toggleOnlyValued}
              />
              Solo valorizzati
            </label>
            <label className="ml-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={onlyConsuntivo}
                onChange={toggleOnlyConsuntivo}
              />
              Solo consuntivo
            </label>
            {!editMode ? (
              <button
                type="button"
                onClick={enableEditMode}
                className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-600"
              >
                Modifica
              </button>
            ) : (
              <div className="ml-auto flex gap-2">
                {dirtyKeys.size > 0 && (
                  <span className="self-center rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1">
                    Modifiche non salvate • {dirtyKeys.size}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={savingState}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingState ? 'Salvataggio…' : 'Salva'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-slate-300"
                >
                  Annulla
                </button>
              </div>
            )}
          </div>
          <PlanTable
            planYear={planYear}
            selectedYear={selectedYear}
            causaliCatalog={causaliCatalog.length > 0 ? causaliCatalog : financialCausali as any}
            editMode={editMode}
            onlyValued={onlyValued}
            onlyConsuntivo={onlyConsuntivo}
            dirtyKeys={dirtyKeys}
            loadingState={loadingState}
            getPlanPreventivoValue={getPlanPreventivoValue}
            getPlanConsuntivoValue={getPlanConsuntivoValue}
            setOverride={handleSetOverride}
          />
        </div>
      )}

      {activeTab === 'causali' && (
        <CausaliManager
          causaliCatalog={causaliCatalog.length > 0 ? causaliCatalog : financialCausali as any}
          onCausaliPersist={handleCausaliPersistWithNotification}
        />
      )}

      {activeTab === 'business-plan' && (
        <BusinessPlanForm
          businessPlanForm={businessPlanForm}
          businessPlanMessage={businessPlanMessage}
          completeYears={completeYears}
          availableYears={availableYears}
          onFieldChange={handleBusinessPlanFieldChange}
          onBaseYearChange={handleBusinessPlanBaseYearChange}
          onTargetYearChange={handleBusinessPlanTargetYearChange}
          onSaveDraft={handleSaveBusinessPlanDraft}
          onApplyToOverrides={applyBusinessPlanToOverrides}
          onReset={handleResetBusinessPlan}
        />
      )}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase text-gray-500">
              DA ANNO
            </label>
            <select
              value={statsFromYear}
              onChange={(event) => setStatsFromYear(Number(event.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <label className="text-xs font-semibold uppercase text-gray-500">
              A ANNO
            </label>
            <select
              value={statsToYear}
              onChange={(event) => setStatsToYear(Number(event.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {!statsEditMode ? (
              <button
                type="button"
                onClick={() => setStatsEditMode(true)}
                className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-600"
              >
                Modifica
              </button>
            ) : (
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatsEditMode(false)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Salva
                </button>
                <button
                  type="button"
                  onClick={() => setStatsEditMode(false)}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-slate-300"
                >
                  Annulla
                </button>
              </div>
            )}
          </div>
          <StatsTable
            availableYears={Array.from({ length: statsToYear - statsFromYear + 1 }, (_, i) => statsFromYear + i)}
            statsOverrides={statsOverrides}
            financialStatsRows={financialStatsRows}
            editMode={statsEditMode}
            getPlanPreventivoValue={getPlanPreventivoValue}
            getPlanConsuntivoValue={getPlanConsuntivoValue}
            onStatsOverride={handleStatsOverride}
            causaliCatalog={causaliCatalog.length > 0 ? causaliCatalog : financialCausali as any}
            planYear={planYear}
          />
        </div>
      )}
    </div>
  );
};

export default FinancialPlan;
