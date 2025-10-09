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
import { financialCausali } from '../data/financialPlanData';
import { calcRatios, round2, parseNumberInput, buildMonthKey, parseMonthKey } from '../utils/financialPlanUtils';
import { calculateAverageMonthlyRatios, distributeAnnualValueToMonths } from '../utils/businessPlanLogic';
import { persistFinancialPlanState, saveFinancialStats } from '../services/financialPlanApi';
import type { TabKey } from '../types';

const FinancialPlan: React.FC = () => {
  const { showNotification, currentLocation } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [periodoMode, setPeriodoMode] = useState<boolean>(false);
  const [selectedFromMonth, setSelectedFromMonth] = useState<number>(0);
  const [selectedFromYear, setSelectedFromYear] = useState<number>(new Date().getFullYear());
  const [selectedToMonth, setSelectedToMonth] = useState<number>(11);
  const [selectedToYear, setSelectedToYear] = useState<number>(new Date().getFullYear());
  const [isBusinessPlanLoading, setIsBusinessPlanLoading] = useState<boolean>(false);
  
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
    financialStatsRows,
    monthlyMetrics,
    setOverride,
    setStatsOverrides,
    handleSavePlan,
    handleCancelPlan,
    handleCausaliPersist,
    handleSaveMetrics,
    getPlanPreventivoValue,
    getPlanConsuntivoValue,
  } = useFinancialPlanData(currentLocation?.id);

  // We need to access the database-backed setters directly
  // This is a temporary solution until we refactor the hook

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

  // Generate available years from basePlanByYear
  const availableYears = React.useMemo(() => {
    const years = Array.from(basePlanByYear.keys()).sort((a, b) => a - b);
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [basePlanByYear]);

  // Update selected year if not available
  useEffect(() => {
    if (!basePlanByYear.has(selectedYear) && availableYears.length > 0) {
      // If selected year is not available, try to find the closest available year
      const closestYear = availableYears.find(year => basePlanByYear.has(year)) || availableYears[0];
      setSelectedYear(closestYear);
    }
  }, [basePlanByYear, selectedYear, availableYears]);

  const planYear = basePlanByYear.get(selectedYear);

  const {
    businessPlanDrafts,
    businessPlanForm,
    businessPlanMessage,
    availableYears: businessPlanAvailableYears,
    completeYears,
    handleBusinessPlanFieldChange,
    handleBusinessPlanBaseYearChange,
    handleBusinessPlanTargetYearChange,
    handleSaveBusinessPlanDraft,
    handleApplyBusinessPlanToOverrides,
    handleDeleteBusinessPlanDraft,
    recalculateForm,
    draftName,
    setDraftName,
    handleLoadDraft,
  } = useBusinessPlan(
    yearMetrics, 
    currentLocation?.id,
    causaliCatalog.length > 0 ? causaliCatalog : financialCausali as any,
    planYear,
    getPlanConsuntivoValue,
    financialStatsRows,
    statsOverrides
  );

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
  const applyBusinessPlanToOverrides = async () => {
    if (!businessPlanForm || businessPlanForm.baseYear === null) {
      showNotification('Compila il Business Plan prima di applicare il previsionale.', 'error');
      return;
    }

    setIsBusinessPlanLoading(true);
    
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

    
    // Per il fatturato, usiamo i dati mensili del fatturato dall'anno base
    const fatturatoRatios = baseMetrics.monthlyFatturato && baseMetrics.fatturatoTotale > 0 
      ? baseMetrics.monthlyFatturato.map(value => value / baseMetrics.fatturatoTotale)
      : new Array(12).fill(1/12);
    
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

    // Applica i valori al piano mensile rispettando le incidenze reali delle causali
    for (const macro of planBase.macros) {
      const macroKey = macro.macro.toUpperCase();
      
      if (!['INCASSATO', 'COSTI FISSI', 'COSTI VARIABILI'].includes(macroKey)) {
        continue;
      }

      // Usa i baseMetrics invece dei dettagli del piano mensile (che sono tutti 0)
      let macroTotalBase = 0;
      switch (macroKey) {
        case 'INCASSATO':
          macroTotalBase = baseMetrics.incassato;
          break;
        case 'COSTI FISSI':
          macroTotalBase = baseMetrics.costiFissi;
          break;
        case 'COSTI VARIABILI':
          macroTotalBase = baseMetrics.costiVariabili;
          break;
      }


      // Valore previsionale annuale per la macro
        let annualTarget = 0;
        let monthlyRatios: number[] = [];

        switch (macroKey) {
          case 'INCASSATO':
          annualTarget = incassatoPrevisionale;
            monthlyRatios = incassatoRatios;
            break;
          case 'COSTI FISSI':
          annualTarget = costiFissiPrevisionale;
            monthlyRatios = costiFissiRatios;
            break;
          case 'COSTI VARIABILI':
          annualTarget = costiVariabiliPrevisionale;
            monthlyRatios = costiVariabiliRatios;
            break;
        }

      // Se il totale della macro è 0, tutte le causali rimangono a 0
      if (macroTotalBase === 0) {
        for (const detail of macro.details) {
          for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            await setOverride('preventivo', detail.macro, detail.category, detail.detail, targetYear, monthIndex, 0);
          }
        }
        continue;
      }

      // Calcola i valori reali delle causali usando getPlanConsuntivoValue
      const causaliValues: { detail: any; totalValue: number; monthlyValues: number[] }[] = [];
      let totalCausaliValue = 0;

      for (const detail of macro.details) {
        const monthlyValues: number[] = [];
        let detailTotal = 0;

        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          const value = getPlanConsuntivoValue(detail.macro, detail.category, detail.detail, businessPlanForm.baseYear!, monthIndex);
          monthlyValues.push(value);
          detailTotal += value;
        }

        causaliValues.push({ detail, totalValue: detailTotal, monthlyValues });
        totalCausaliValue += detailTotal;
      }

      // Distribuisci il valore previsionale basandosi sui valori reali delle causali
      for (const causale of causaliValues) {
        if (causale.totalValue === 0) {
          for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            await setOverride('preventivo', causale.detail.macro, causale.detail.category, causale.detail.detail, targetYear, monthIndex, 0);
          }
          continue;
        }

        // Calcola l'incidenza della causale sul totale della macro
        const causaleShare = totalCausaliValue === 0 ? 0 : causale.totalValue / totalCausaliValue;
        const causaleAnnualTarget = round2(annualTarget * causaleShare);

        // Calcola le incidenze mensili della causale basandosi sui suoi valori reali
        const causaleMonthlyRatios = causale.monthlyValues.map(value =>
          causale.totalValue === 0 ? 0 : value / causale.totalValue
        );

        // Distribuisci il valore annuale sui 12 mesi
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          const monthValue = round2(causaleAnnualTarget * causaleMonthlyRatios[monthIndex]);
          await setOverride('preventivo', causale.detail.macro, causale.detail.category, causale.detail.detail, targetYear, monthIndex, monthValue);
        }
      }
    }

    // Applica i valori alle statistiche
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthKey = buildMonthKey(targetYear, monthIndex);
      filteredStatsOverrides[`${monthKey}|fatturatoPrevisionale`] = round2(fatturatoPrevisionale * fatturatoRatios[monthIndex]);
      filteredStatsOverrides[`${monthKey}|incassatoPrevisionale`] = incassatoMensile[monthIndex];
      filteredStatsOverrides[`${monthKey}|utilePrevisionale`] = round2(incassatoMensile[monthIndex] - costiFissiMensile[monthIndex] - costiVariabiliMensile[monthIndex]);
    }

    // Aggiorna gli override delle statistiche
    setStatsOverrides(filteredStatsOverrides);

    // SALVA AUTOMATICAMENTE NEL DATABASE CON GLI OVERRIDES AGGIORNATI
    
    // Crea il payload con gli overrides aggiornati
    const updatedPlanOverrides = { ...planOverrides };
    const updatedStatsOverrides = { ...statsOverrides, ...filteredStatsOverrides };
    
    // Update database-backed overrides immediately (will be handled by setStatsOverrides)
    
    // Salva direttamente con persistFinancialPlanState
    const payload = {
      preventivoOverrides: updatedPlanOverrides,
      consuntivoOverrides: consuntivoOverrides,
      manualLog: [],
      monthlyMetrics: monthlyMetrics,
      statsOverrides: updatedStatsOverrides,
      causaliCatalog: causaliCatalog,
      causaliVersion: null,
    };
    
    if (currentLocation?.id) {
      try {
        await persistFinancialPlanState(payload, currentLocation.id);
        
        // Salva anche le statistiche
        const monthNames = ['Gen.', 'Feb.', 'Mar.', 'Apr.', 'Mag.', 'Giu.', 'Lug.', 'Ago.', 'Set.', 'Ott.', 'Nov.', 'Dic.'];
        const statsRows: any[] = [];
        const monthData = new Map<string, any>();
        
        Object.entries(updatedStatsOverrides).forEach(([key, value]) => {
          const [monthKey, field] = key.split('|');
          if (!monthKey || !field) return;
          
          const parsed = parseMonthKey(monthKey);
          if (!parsed || parsed.year !== targetYear) return;
          
          if (!monthData.has(monthKey)) {
            monthData.set(monthKey, {
              month: `${monthNames[parsed.monthIndex]} ${parsed.year.toString().slice(-2)}`,
              year: parsed.year,
              monthIndex: parsed.monthIndex
            });
          }
          
          monthData.get(monthKey)[field] = value;
        });
        
        monthData.forEach((data) => {
          statsRows.push(data);
        });
        
        const statsToSave = statsRows.sort((a, b) => a.monthIndex - b.monthIndex);
        await saveFinancialStats(currentLocation.id, statsToSave);
        
        showNotification(`Previsionale ${targetYear} applicato e salvato nel database.`, 'success');
      } catch (error) {
        console.error('❌ Errore nel salvataggio:', error);
        showNotification(`Previsionale ${targetYear} applicato ma errore nel salvataggio.`, 'error');
      }
    }
    
    setIsBusinessPlanLoading(false);
  };

  const handleResetBusinessPlan = async () => {
    if (!businessPlanForm) {
      return;
    }
    
    setIsBusinessPlanLoading(true);
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

    // Aggiungi esplicitamente gli override a zero per le statistiche previsionali
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthKey = buildMonthKey(targetYear, monthIndex);
      filteredStatsOverrides[`${monthKey}|fatturatoPrevisionale`] = 0;
      filteredStatsOverrides[`${monthKey}|incassatoPrevisionale`] = 0;
      filteredStatsOverrides[`${monthKey}|utilePrevisionale`] = 0;
    }

    
    // Aggiorna gli stati locali immediatamente per l'UI
    setStatsOverrides(filteredStatsOverrides);
    
    // Azzera anche tutti i campi preventivo del piano mensile per l'anno target
    const planBase = basePlanByYear.get(businessPlanForm.baseYear);
    if (planBase) {
      for (const macro of planBase.macros) {
        for (const detail of macro.details) {
          for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            await setOverride('preventivo', detail.macro, detail.category, detail.detail, targetYear, monthIndex, null);
          }
        }
      }
    }
    
    // Salva nel database
    if (currentLocation?.id) {
      try {
        const payload = {
          preventivoOverrides: filteredPlanOverrides,
          consuntivoOverrides: consuntivoOverrides,
          manualLog: [],
          monthlyMetrics: monthlyMetrics,
          statsOverrides: filteredStatsOverrides,
          causaliCatalog: causaliCatalog,
          causaliVersion: null,
        };
        
        await persistFinancialPlanState(payload, currentLocation.id);
        
        // Salva anche le statistiche
        const monthNames = ['Gen.', 'Feb.', 'Mar.', 'Apr.', 'Mag.', 'Giu.', 'Lug.', 'Ago.', 'Set.', 'Ott.', 'Nov.', 'Dic.'];
        const statsRows: any[] = [];
        const monthData = new Map<string, any>();
        
        Object.entries(filteredStatsOverrides).forEach(([key, value]) => {
          const [monthKey, field] = key.split('|');
          if (!monthKey || !field) return;
          
          const parsed = parseMonthKey(monthKey);
          if (!parsed || parsed.year !== targetYear) return;
          
          if (!monthData.has(monthKey)) {
            monthData.set(monthKey, {
              month: `${monthNames[parsed.monthIndex]} ${parsed.year.toString().slice(-2)}`,
              year: parsed.year,
              monthIndex: parsed.monthIndex
            });
          }
          
          monthData.get(monthKey)[field] = value;
        });
        
        monthData.forEach((data) => {
          statsRows.push(data);
        });
        
        const statsToSave = statsRows.sort((a, b) => a.monthIndex - b.monthIndex);
        await saveFinancialStats(currentLocation.id, statsToSave);
        
        showNotification(`Previsionale ${targetYear} ripristinato e salvato nel database.`, 'success');
      } catch (error) {
        console.error('❌ Errore nel reset:', error);
        showNotification(`Errore nel ripristino del previsionale ${targetYear}.`, 'error');
      }
    }
    
    setIsBusinessPlanLoading(false);
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
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={periodoMode}
                onChange={(e) => setPeriodoMode(e.target.checked)}
              />
              Periodo
            </label>
            {!periodoMode ? (
              <>
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
              </>
            ) : (
              <>
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Da
                </label>
                <select
                  value={selectedFromMonth}
                  onChange={(event) => setSelectedFromMonth(Number(event.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'].map((month, index) => (
                    <option key={index} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedFromYear}
                  onChange={(event) => setSelectedFromYear(Number(event.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <label className="text-xs font-semibold uppercase text-gray-500">
                  A
                </label>
                <select
                  value={selectedToMonth}
                  onChange={(event) => setSelectedToMonth(Number(event.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'].map((month, index) => (
                    <option key={index} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedToYear}
                  onChange={(event) => setSelectedToYear(Number(event.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </>
            )}
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
            periodoMode={periodoMode}
            selectedFromMonth={selectedFromMonth}
            selectedFromYear={selectedFromYear}
            selectedToMonth={selectedToMonth}
            selectedToYear={selectedToYear}
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
          availableYears={businessPlanAvailableYears}
          businessPlanDrafts={businessPlanDrafts}
          yearMetrics={yearMetrics}
          causaliCatalog={causaliCatalog.length > 0 ? causaliCatalog : financialCausali as any}
          planYear={planYear}
          getPlanConsuntivoValue={getPlanConsuntivoValue}
          financialStatsRows={financialStatsRows}
          statsOverrides={statsOverrides}
          draftName={draftName}
          setDraftName={setDraftName}
          onFieldChange={handleBusinessPlanFieldChange}
          onBaseYearChange={handleBusinessPlanBaseYearChange}
          onTargetYearChange={handleBusinessPlanTargetYearChange}
          onSaveDraft={handleSaveBusinessPlanDraft}
          onApplyToOverrides={applyBusinessPlanToOverrides}
          onReset={handleResetBusinessPlan}
          onDeleteDraft={handleDeleteBusinessPlanDraft}
          onRecalculate={recalculateForm}
          onLoadDraft={handleLoadDraft}
          isLoading={isBusinessPlanLoading}
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
