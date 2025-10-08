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
import { InserisciDati } from './financial/InserisciDati';
import { AnalisiFP } from './financial/AnalisiFP';
import { financialCausali, financialStats as financialStatsRows } from '../data/financialPlanData';
import { calcRatios, round2, parseNumberInput, buildMonthKey, parseMonthKey } from '../utils/financialPlanUtils';
import { calculateAverageMonthlyRatios, distributeAnnualValueToMonths } from '../utils/businessPlanLogic';
import type { TabKey } from '../types';

const FinancialPlan: React.FC = () => {
  const { showNotification, currentLocation } = useAppContext();
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
    handleSaveMetrics,
    getPlanPreventivoValue,
    getPlanConsuntivoValue,
  } = useFinancialPlanData(currentLocation?.id);

  const {
    businessPlanDrafts,
    businessPlanForm,
    businessPlanMessage,
    availableYears,
    completeYears,
    handleBusinessPlanFieldChange,
    handleBusinessPlanBaseYearChange,
    handleBusinessPlanTargetYearChange,
    handleSaveBusinessPlanDraft,
    handleApplyBusinessPlanToOverrides,
    handleDeleteBusinessPlanDraft,
  } = useBusinessPlan(yearMetrics, currentLocation?.id);

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


  const handleCausaliPersistWithNotification = async (causali: any[]) => {
    const success = await handleCausaliPersist(causali);
    if (success) {
      showNotification('Catalogo causali aggiornato.', 'success');
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

    // Controlla se ci sono override esistenti per l'anno target
    const hasExistingOverrides = Object.keys(planOverrides).some(key => 
      key.includes(`|${targetYear}|`)
    ) || Object.keys(statsOverrides).some(key => 
      key.includes(`|${targetYear}|`)
    );

    if (hasExistingOverrides) {
      const confirmed = window.confirm(
        `Sono presenti dati previsionali per l'anno ${targetYear}. Vuoi sovrascriverli?`
      );
      if (!confirmed) {
        return;
      }
    }

    // Svuota tutti i campi previsionali dell'anno target
    const filteredPlanOverrides = { ...planOverrides };
    const filteredStatsOverrides = { ...statsOverrides };

    // Rimuovi override del piano mensile per l'anno target
    Object.keys(filteredPlanOverrides).forEach(key => {
      if (key.includes(`|${targetYear}|`)) {
        delete filteredPlanOverrides[key];
      }
    });

    // Rimuovi override delle statistiche per l'anno target
    Object.keys(filteredStatsOverrides).forEach(key => {
      if (key.includes(`|${targetYear}|`)) {
        delete filteredStatsOverrides[key];
      }
    });

    // Calcola le incidenze mensili per le macro categorie usando l'anno base
    const baseMetrics = yearMetrics.get(businessPlanForm.baseYear);
    if (!baseMetrics) {
      showNotification('Dati storici insufficienti per l\'anno base selezionato.', 'error');
      return;
    }

    // Calcola le incidenze mensili per ogni macro categoria
    const incassatoRatios = baseMetrics.monthlyIncassato && baseMetrics.incassato > 0 
      ? baseMetrics.monthlyIncassato.map(value => value / baseMetrics.incassato)
      : new Array(12).fill(1/12);
    
    const costiFissiRatios = baseMetrics.monthlyCostiFissi && baseMetrics.costiFissi > 0
      ? baseMetrics.monthlyCostiFissi.map(value => value / baseMetrics.costiFissi)
      : new Array(12).fill(1/12);
    
    const costiVariabiliRatios = baseMetrics.monthlyCostiVariabili && baseMetrics.costiVariabili > 0
      ? baseMetrics.monthlyCostiVariabili.map(value => value / baseMetrics.costiVariabili)
      : new Array(12).fill(1/12);

    // Distribuisci i valori annuali sui mesi
    const incassatoMensile = distributeAnnualValueToMonths(incassatoPrevisionale, incassatoRatios);
    const costiFissiMensile = distributeAnnualValueToMonths(costiFissiPrevisionale, costiFissiRatios);
    const costiVariabiliMensile = distributeAnnualValueToMonths(costiVariabiliPrevisionale, costiVariabiliRatios);

    // Applica i valori al piano mensile per ogni singola riga elementare
    planBase.macros.forEach((macro) => {
      const macroKey = macro.macro.toUpperCase();
      if (!['INCASSATO', 'COSTI FISSI', 'COSTI VARIABILI'].includes(macroKey)) {
        return;
      }

      // Calcola il totale della macro categoria nell'anno base
      const macroTotalBase = macro.details
        .map((detail) =>
          detail.months.reduce((acc, month) => acc + (month.consuntivo ?? 0), 0),
        )
        .reduce((acc, value) => acc + value, 0);

      macro.details.forEach((detail) => {
        // Calcola il totale della singola riga nell'anno base
        const detailSum = detail.months.reduce(
          (acc, month) => acc + (month.consuntivo ?? 0),
          0,
        );
        
        // Calcola l'incidenza della singola riga rispetto alla macro categoria
        const detailShare = macroTotalBase === 0 ? 0 : detailSum / macroTotalBase;

        // Calcola il target annuale per questa singola riga
        let annualTarget = 0;
        let monthlyRatios: number[] = [];

        switch (macroKey) {
          case 'INCASSATO':
            annualTarget = round2(incassatoPrevisionale * detailShare);
            monthlyRatios = incassatoRatios;
            break;
          case 'COSTI FISSI':
            annualTarget = round2(costiFissiPrevisionale * detailShare);
            monthlyRatios = costiFissiRatios;
            break;
          case 'COSTI VARIABILI':
            annualTarget = round2(costiVariabiliPrevisionale * detailShare);
            monthlyRatios = costiVariabiliRatios;
            break;
        }

        // Distribuisci il target annuale sui 12 mesi usando le incidenze mensili
        monthlyRatios.forEach((ratio, monthIndex) => {
          const monthValue = round2(annualTarget * ratio);
          const monthKey = buildMonthKey(targetYear, monthIndex);
          
          // Applica il valore usando setOverride
          setOverride('preventivo', detail.macro, detail.category, detail.detail, targetYear, monthIndex, monthValue);
        });
      });
    });

    // Applica i valori alle statistiche
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthKey = buildMonthKey(targetYear, monthIndex);
      filteredStatsOverrides[`${monthKey}|fatturatoPrevisionale`] = round2(fatturatoPrevisionale * incassatoRatios[monthIndex]);
      filteredStatsOverrides[`${monthKey}|incassatoPrevisionale`] = incassatoMensile[monthIndex];
      filteredStatsOverrides[`${monthKey}|utilePrevisionale`] = round2(incassatoMensile[monthIndex] - costiFissiMensile[monthIndex] - costiVariabiliMensile[monthIndex]);
    }

    // Aggiorna gli override delle statistiche
    setStatsOverrides(filteredStatsOverrides);

    showNotification(`Previsionale ${targetYear} applicato e salvato.`, 'success');
  };

  const handleResetBusinessPlan = () => {
    if (!businessPlanForm) {
      return;
    }
    const targetYear = businessPlanForm.targetYear;
    
    // Svuota tutti i campi previsionali dell'anno target
    const filteredPlanOverrides = { ...planOverrides };
    const filteredStatsOverrides = { ...statsOverrides };

    // Rimuovi override del piano mensile per l'anno target
    Object.keys(filteredPlanOverrides).forEach(key => {
      if (key.includes(`|${targetYear}|`)) {
        delete filteredPlanOverrides[key];
      }
    });

    // Rimuovi override delle statistiche per l'anno target
    Object.keys(filteredStatsOverrides).forEach(key => {
      if (key.includes(`|${targetYear}|`)) {
        delete filteredStatsOverrides[key];
      }
    });

    setStatsOverrides(filteredStatsOverrides);
    showNotification(`Previsionale ${targetYear} ripristinato.`, 'info');
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
    { key: 'inserisci-dati', label: 'Inserisci Dati' },
    { key: 'analisi-fp', label: 'Analisi FP' },
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
          financialStatsRows={financialStatsRows}
          causaliCatalog={causaliCatalog.length > 0 ? causaliCatalog : financialCausali as any}
          getPlanConsuntivoValue={getPlanConsuntivoValue}
          statsOverrides={statsOverrides}
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
            consuntivoOverrides={consuntivoOverrides}
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
          businessPlanDrafts={businessPlanDrafts}
          onFieldChange={handleBusinessPlanFieldChange}
          onBaseYearChange={handleBusinessPlanBaseYearChange}
          onTargetYearChange={handleBusinessPlanTargetYearChange}
          onSaveDraft={handleSaveBusinessPlanDraft}
          onApplyToOverrides={applyBusinessPlanToOverrides}
          onReset={handleResetBusinessPlan}
          onDeleteDraft={handleDeleteBusinessPlanDraft}
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
                  onClick={async () => {
                    try {
                      const success = await handleSavePlan(selectedYear, new Set());
                      if (success) {
                        setStatsEditMode(false);
                        showNotification('Statistiche salvate con successo.', 'success');
                      }
                    } catch (error) {
                      console.error('Error saving statistics:', error);
                      showNotification('Errore nel salvataggio delle statistiche.', 'error');
                    }
                  }}
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

      {activeTab === 'inserisci-dati' && (
        <InserisciDati
          causaliCatalog={causaliCatalog.length > 0 ? causaliCatalog : financialCausali as any}
        />
      )}

      {activeTab === 'analisi-fp' && (
        <AnalisiFP
          availableYears={availableYears}
          statsOverrides={statsOverrides}
          financialStatsRows={financialStatsRows}
          getPlanPreventivoValue={getPlanPreventivoValue}
          getPlanConsuntivoValue={getPlanConsuntivoValue}
          causaliCatalog={causaliCatalog.length > 0 ? causaliCatalog : financialCausali as any}
          planYear={planYear}
        />
      )}
    </div>
  );
};

export default FinancialPlan;
