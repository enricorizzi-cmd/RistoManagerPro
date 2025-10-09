// Business Plan Hook
// Manages business plan form state and calculations

import { useState, useEffect, useMemo, useCallback } from 'react';
import { debounce } from 'lodash';
import type { BusinessPlanYearMetrics } from '../utils/financialCalculations';
import { parseNumberInput, buildMonthKey, parsePlanMonthLabel } from '../utils/financialPlanUtils';
import { getIncassatoTotal, getCostiFissiTotal, getCostiVariabiliTotal } from '../utils/financialCalculations';
import { 
  createBusinessPlanFormFromMetrics, 
  createBusinessPlanFormFromDraft, 
  recalcBusinessPlan,
  type BusinessPlanFormState,
  type BusinessPlanDraft,
  type BusinessPlanDrafts,
  type BusinessPlanMessage
} from '../utils/businessPlanLogic';

// API functions for business plan drafts
const fetchBusinessPlanDrafts = async (locationId: string): Promise<BusinessPlanDrafts> => {
  try {
    const response = await fetch(`http://localhost:4000/api/business-plan-drafts?locationId=${locationId}`);
    if (!response.ok) throw new Error('Failed to fetch drafts');
    return await response.json();
  } catch (error) {
    console.warn('Failed to load business plan drafts from database:', error);
    return {};
  }
};

const saveBusinessPlanDraft = async (targetYear: number, data: BusinessPlanDraft, locationId: string): Promise<void> => {
  try {
    const response = await fetch('http://localhost:4000/api/business-plan-drafts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetYear, data, locationId }),
    });
    if (!response.ok) throw new Error('Failed to save draft');
  } catch (error) {
    console.error('Failed to save business plan draft to database:', error);
    throw error;
  }
};

export const useBusinessPlan = (
  yearMetrics: Map<number, BusinessPlanYearMetrics>, 
  locationId?: string,
  causaliCatalog?: any[],
  planYear?: any,
  getPlanConsuntivoValue?: (macro: string, category: string, detail: string, year: number, monthIndex: number) => number,
  financialStatsRows?: any[],
  statsOverrides?: any
) => {
  const [businessPlanDrafts, setBusinessPlanDrafts] = useState<BusinessPlanDrafts>({});
  const [businessPlanForm, setBusinessPlanForm] = useState<BusinessPlanFormState | null>(null);
  const [businessPlanMessage, setBusinessPlanMessage] = useState<BusinessPlanMessage | null>(null);

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    // Base range: current year - 5 to current year + 1
    const baseYears = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
    
    // Find the minimum year that has data
    let minYearWithData = currentYear - 5;
    yearMetrics.forEach((_, year) => {
      if (year < minYearWithData) {
        minYearWithData = year;
      }
    });
    
    // Extend range backwards if there are data before current-5
    const extendedYears = Array.from(
      { length: currentYear + 1 - minYearWithData + 1 }, 
      (_, i) => minYearWithData + i
    );
    
    return extendedYears.sort((a: number, b: number) => a - b);
  }, [currentYear, yearMetrics]);

  const completeYears = useMemo(() => {
    const years: number[] = [];
    
    // Se abbiamo i dati necessari, usiamo la stessa logica di AnalisiFP
    if (causaliCatalog && planYear && getPlanConsuntivoValue && financialStatsRows) {
      
      // Helper function per ottenere il fatturato dalle statistiche (stessa logica di AnalisiFP)
      const getFatturatoFromStats = (year: number, monthIndex: number) => {
        const monthKey = buildMonthKey(year, monthIndex);
        
        // Find stats data
        const statsRow = financialStatsRows.find(row => {
          const parsed = parsePlanMonthLabel(row.month);
          if (parsed) {
            const { year: rowYear, monthIndex: rowMonthIndex } = parsed;
            return rowYear === year && rowMonthIndex === monthIndex;
          }
          return false;
        });
        
        if (statsRow) {
          // Use the same logic as AnalisiFP's getFieldValue
          const dataWithKey = { ...statsRow, monthKey };
          const overrideKey = `${monthKey}|fatturatoTotale`;
          const fatturatoFromStats = statsOverrides?.[overrideKey] ?? dataWithKey.fatturatoTotale;
          const fatturatoImponibile = statsOverrides?.[`${monthKey}|fatturatoImponibile`] ?? dataWithKey.fatturatoImponibile;
          
          let fatturatoTotale = fatturatoFromStats;
          if (fatturatoTotale === null || fatturatoTotale === undefined) {
            fatturatoTotale = fatturatoImponibile;
          }
          
          return fatturatoTotale ?? 0;
        }
        
        return 0;
      };
      
      // Verifica ogni anno disponibile
      yearMetrics.forEach((_, year) => {
        let hasAllMonths = true;
        
        // Verifica tutti i 12 mesi
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          const incassato = getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex);
          const costiFissi = getCostiFissiTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex);
          const costiVariabili = getCostiVariabiliTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex);
          const fatturato = getFatturatoFromStats(year, monthIndex);
          
          if (incassato === null || incassato === undefined || incassato === 0 || 
              costiFissi === null || costiFissi === undefined || costiFissi === 0 || 
              costiVariabili === null || costiVariabili === undefined || costiVariabili === 0 || 
              fatturato === null || fatturato === undefined || fatturato === 0) {
            hasAllMonths = false;
            break;
          }
        }
        
        if (hasAllMonths) {
          years.push(year);
        }
      });
    } else {
      // Fallback alla logica originale se non abbiamo tutti i dati
      yearMetrics.forEach((metrics, year) => {
        const hasMonths =
          (metrics as any).monthlyIncassato?.length === 12 &&
          (metrics as any).monthlyCostiFissi?.length === 12 &&
          metrics.monthlyCostiVariabili.length === 12;
        if (hasMonths) {
          years.push(year);
        }
      });
    }
    
    return years.sort((a, b) => a - b);
  }, [yearMetrics, causaliCatalog, planYear, getPlanConsuntivoValue, financialStatsRows, statsOverrides]);

  // Load drafts from database
  useEffect(() => {
    if (locationId) {
      fetchBusinessPlanDrafts(locationId).then(setBusinessPlanDrafts);
    }
  }, [locationId]);

  // Save drafts to database
  useEffect(() => {
    if (Object.keys(businessPlanDrafts).length > 0 && locationId) {
      // Save each draft to database
      Object.entries(businessPlanDrafts).forEach(([targetYear, draft]) => {
        saveBusinessPlanDraft(parseInt(targetYear), draft, locationId).catch(console.error);
      });
    }
  }, [businessPlanDrafts, locationId]);

  // Initialize form
  useEffect(() => {
    if (businessPlanForm) {
      return;
    }
    const defaultBaseYear =
      completeYears.length > 0
        ? completeYears[completeYears.length - 1]
        : currentYear;
    const defaultTarget = defaultBaseYear + 1;
    const stored = businessPlanDrafts[String(defaultTarget)];
    const form = stored
      ? createBusinessPlanFormFromDraft(stored)
      : createBusinessPlanFormFromMetrics(
          yearMetrics.get(defaultBaseYear),
          defaultBaseYear,
          defaultTarget,
        );
    setBusinessPlanForm(recalcBusinessPlan(form, yearMetrics));
  }, [
    businessPlanForm,
    businessPlanDrafts,
    completeYears,
    currentYear,
    yearMetrics,
  ]);

  const handleBusinessPlanFieldChange = useCallback((
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
  ) => {
    setBusinessPlanForm((prev) => {
      if (!prev) {
        return prev;
      }
      const next: BusinessPlanFormState = { ...prev };
      
      // Helper function to clean currency values
      const cleanCurrencyValue = (val: string): string => {
        // Remove € symbol, spaces, but keep the raw number as string
        const cleaned = val.replace(/[€\s,]/g, '');
        return cleaned === '' ? '' : cleaned;
      };
      
      switch (field) {
        case 'fatturatoIncrement':
          next.fatturatoIncrement = value;
          break;
        case 'fatturatoValue':
          next.fatturatoPrevisionale = cleanCurrencyValue(value);
          break;
        case 'incassatoPercent':
          next.incassatoPercent = value;
          break;
        case 'incassatoValue':
          next.incassatoPrevisionale = cleanCurrencyValue(value);
          break;
        case 'costiFissiPercent':
          next.costiFissiPercent = value;
          break;
        case 'costiFissiValue':
          next.costiFissiPrevisionale = cleanCurrencyValue(value);
          break;
        case 'costiVariabiliPercent':
          next.costiVariabiliPercent = value;
          break;
        case 'costiVariabiliValue':
          next.costiVariabiliPrevisionale = cleanCurrencyValue(value);
          break;
        default:
          break;
      }
      // Don't recalculate during typing - just update the field
      return next;
    });
  }, []);

  // Manual recalculation function - call when needed
  const recalculateForm = useCallback(() => {
    if (businessPlanForm) {
      const recalculated = recalcBusinessPlan(businessPlanForm, yearMetrics);
      setBusinessPlanForm(recalculated);
    }
  }, [businessPlanForm, yearMetrics]);

  const handleBusinessPlanBaseYearChange = useCallback((year: number) => {
    const metrics = yearMetrics.get(year);
    const stored = businessPlanDrafts[String(year + 1)];
    const form = stored
      ? createBusinessPlanFormFromDraft(stored)
      : createBusinessPlanFormFromMetrics(metrics, year, year + 1);
    setBusinessPlanForm(form); // Don't recalculate automatically
  }, [yearMetrics, businessPlanDrafts]);

  const handleBusinessPlanTargetYearChange = useCallback((value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    const targetYear = Math.max(0, Math.round(parsed));
    setBusinessPlanForm((prev) => {
      if (!prev) {
        return prev;
      }
      const stored = businessPlanDrafts[String(targetYear)];
      if (stored && stored.baseYear === prev.baseYear) {
        return createBusinessPlanFormFromDraft(stored); // Don't recalculate automatically
      }
      return {
        ...prev,
        targetYear,
      }; // Don't recalculate automatically
    });
  }, [yearMetrics, businessPlanDrafts]);

  const handleSaveBusinessPlanDraft = useCallback(() => {
    if (!businessPlanForm || businessPlanForm.baseYear === null) {
      setBusinessPlanMessage({
        type: 'error',
        text: 'Seleziona un anno base valido prima di salvare.',
      });
      return;
    }
    const normalized = recalcBusinessPlan(businessPlanForm, yearMetrics);
    const draft: BusinessPlanDraft = {
      baseYear: normalized.baseYear!,
      targetYear: normalized.targetYear,
      fatturatoAnnoBase: parseNumberInput(normalized.fatturatoAnnoBase) ?? 0,
      fatturatoIncrement: parseNumberInput(normalized.fatturatoIncrement) ?? 0,
      fatturatoPrevisionale: parseNumberInput(normalized.fatturatoPrevisionale) ?? 0,
      incassatoPercent: parseNumberInput(normalized.incassatoPercent) ?? 0,
      incassatoPrevisionale: parseNumberInput(normalized.incassatoPrevisionale) ?? 0,
      costiFissiPercent: parseNumberInput(normalized.costiFissiPercent) ?? 0,
      costiFissiPrevisionale: parseNumberInput(normalized.costiFissiPrevisionale) ?? 0,
      costiVariabiliPercent: parseNumberInput(normalized.costiVariabiliPercent) ?? 0,
      costiVariabiliPrevisionale: parseNumberInput(normalized.costiVariabiliPrevisionale) ?? 0,
      createdAt: new Date().toISOString(),
    };
    
    // Save to database
    if (locationId) {
      saveBusinessPlanDraft(draft.targetYear, draft, locationId)
        .then(() => {
        setBusinessPlanDrafts((prev) => ({
          ...prev,
          [String(draft.targetYear)]: draft,
        }));
        setBusinessPlanForm(normalized);
        setBusinessPlanMessage({
          type: 'success',
          text: `Previsionale ${normalized.targetYear} salvato come bozza.`,
        });
        })
        .catch((error) => {
          setBusinessPlanMessage({
            type: 'error',
            text: 'Errore nel salvataggio della bozza.',
          });
          console.error('Failed to save business plan draft:', error);
        });
    }
  }, [businessPlanForm, yearMetrics, locationId]);

  const handleApplyBusinessPlanToOverrides = useCallback(() => {
    if (!businessPlanForm || businessPlanForm.baseYear === null) {
      setBusinessPlanMessage({
        type: 'error',
        text: 'Compila il Business Plan prima di applicare il previsionale.',
      });
      return;
    }
    // Questa funzione sarà implementata nel componente principale
    setBusinessPlanMessage({
      type: 'success',
      text: `Previsionale ${businessPlanForm.targetYear} applicato e salvato.`,
    });
  }, [businessPlanForm]);

  const handleResetBusinessPlan = useCallback(() => {
    if (!businessPlanForm) {
      return;
    }
    const targetYear = businessPlanForm.targetYear;
    setBusinessPlanMessage({
      type: 'info',
      text: `Previsionale ${targetYear} ripristinato.`,
    });
    // Questa funzione sarà implementata nel componente principale
  }, [businessPlanForm]);

  const handleDeleteBusinessPlanDraft = useCallback((targetYear: number) => {
    setBusinessPlanDrafts((prev) => {
      const newDrafts = { ...prev };
      delete newDrafts[String(targetYear)];
      return newDrafts;
    });
    setBusinessPlanMessage({
      type: 'info',
      text: `Bozza previsionale ${targetYear} eliminata.`,
    });
  }, []);

  const clearBusinessPlanMessage = useCallback(() => {
    setBusinessPlanMessage(null);
  }, []);

  return {
    // State
    businessPlanDrafts,
    businessPlanForm,
    businessPlanMessage,
    availableYears,
    completeYears,
    
    // Actions
    handleBusinessPlanFieldChange,
    handleBusinessPlanBaseYearChange,
    handleBusinessPlanTargetYearChange,
    handleSaveBusinessPlanDraft,
    handleApplyBusinessPlanToOverrides,
    handleResetBusinessPlan,
    handleDeleteBusinessPlanDraft,
    clearBusinessPlanMessage,
    recalculateForm,
  };
};
