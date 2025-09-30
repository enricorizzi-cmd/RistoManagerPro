// Business Plan Hook
// Manages business plan form state and calculations

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { BusinessPlanYearMetrics } from '../utils/financialCalculations';
import { parseNumberInput } from '../utils/financialPlanUtils';
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
const fetchBusinessPlanDrafts = async (): Promise<BusinessPlanDrafts> => {
  try {
    const response = await fetch('http://localhost:4000/api/business-plan-drafts');
    if (!response.ok) throw new Error('Failed to fetch drafts');
    return await response.json();
  } catch (error) {
    console.warn('Failed to load business plan drafts from database:', error);
    return {};
  }
};

const saveBusinessPlanDraft = async (targetYear: number, data: BusinessPlanDraft): Promise<void> => {
  try {
    const response = await fetch('http://localhost:4000/api/business-plan-drafts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetYear, data }),
    });
    if (!response.ok) throw new Error('Failed to save draft');
  } catch (error) {
    console.error('Failed to save business plan draft to database:', error);
    throw error;
  }
};

export const useBusinessPlan = (yearMetrics: Map<number, BusinessPlanYearMetrics>) => {
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
    yearMetrics.forEach((metrics, year) => {
      const hasMonths =
        (metrics as any).monthlyIncassato?.length === 12 &&
        (metrics as any).monthlyCostiFissi?.length === 12 &&
        metrics.monthlyCostiVariabili.length === 12;
      if (hasMonths) {
        years.push(year);
      }
    });
    return years.sort((a, b) => a - b);
  }, [yearMetrics]);

  // Load drafts from database
  useEffect(() => {
    fetchBusinessPlanDrafts().then(setBusinessPlanDrafts);
  }, []);

  // Save drafts to database
  useEffect(() => {
    if (Object.keys(businessPlanDrafts).length > 0) {
      // Save each draft to database
      Object.entries(businessPlanDrafts).forEach(([targetYear, draft]) => {
        saveBusinessPlanDraft(parseInt(targetYear), draft).catch(console.error);
      });
    }
  }, [businessPlanDrafts]);

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
      switch (field) {
        case 'fatturatoIncrement':
          next.fatturatoIncrement = value;
          break;
        case 'fatturatoValue':
          next.fatturatoPrevisionale = value;
          break;
        case 'incassatoPercent':
          next.incassatoPercent = value;
          break;
        case 'incassatoValue':
          next.incassatoPrevisionale = value;
          break;
        case 'costiFissiPercent':
          next.costiFissiPercent = value;
          break;
        case 'costiFissiValue':
          next.costiFissiPrevisionale = value;
          break;
        case 'costiVariabiliPercent':
          next.costiVariabiliPercent = value;
          break;
        case 'costiVariabiliValue':
          next.costiVariabiliPrevisionale = value;
          break;
        default:
          break;
      }
      return recalcBusinessPlan(next, yearMetrics, field);
    });
  }, [yearMetrics]);

  const handleBusinessPlanBaseYearChange = useCallback((year: number) => {
    const metrics = yearMetrics.get(year);
    const stored = businessPlanDrafts[String(year + 1)];
    const form = stored
      ? createBusinessPlanFormFromDraft(stored)
      : createBusinessPlanFormFromMetrics(metrics, year, year + 1);
    setBusinessPlanForm(recalcBusinessPlan(form, yearMetrics));
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
        return recalcBusinessPlan(createBusinessPlanFormFromDraft(stored), yearMetrics);
      }
      return recalcBusinessPlan({
        ...prev,
        targetYear,
      }, yearMetrics);
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
    saveBusinessPlanDraft(draft.targetYear, draft)
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
  }, [businessPlanForm, yearMetrics]);

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
  };
};
