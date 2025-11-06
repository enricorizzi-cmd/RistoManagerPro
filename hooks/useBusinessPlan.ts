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
  type BusinessPlanMessage
} from '../utils/businessPlanLogic';

// API functions for business plan drafts
const fetchBusinessPlanDrafts = async (locationId: string): Promise<any[]> => {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: globalThis.HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`http://localhost:4000/api/business-plan-drafts?locationId=${locationId}`, {
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch drafts');
    return await response.json();
  } catch (error) {
    console.warn('Failed to load business plan drafts from database:', error);
    return [];
  }
};

const saveBusinessPlanDraft = async (targetYear: number, name: string, data: BusinessPlanDraft, locationId: string): Promise<void> => {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: globalThis.HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch('http://localhost:4000/api/business-plan-drafts', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ targetYear, name, data, locationId }),
    });
    if (!response.ok) throw new Error('Failed to save draft');
  } catch (error) {
    console.error('Failed to save business plan draft to database:', error);
    throw error;
  }
};

const deleteBusinessPlanDraft = async (draftId: string, locationId: string): Promise<void> => {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: globalThis.HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`http://localhost:4000/api/business-plan-drafts/${draftId}?locationId=${locationId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete draft');
  } catch (error) {
    console.error('Failed to delete business plan draft from database:', error);
    throw error;
  }
};

export const useBusinessPlan = (
  yearMetrics: Map<number, BusinessPlanYearMetrics>, 
  locationId?: string,
  _causaliCatalog?: any[],
  _planYear?: any,
  _getPlanConsuntivoValue?: (_macro: string, _category: string, _detail: string, _year: number, _monthIndex: number) => number,
  _financialStatsRows?: any[],
  _statsOverrides?: any
) => {
  const [businessPlanDrafts, setBusinessPlanDrafts] = useState<any[]>([]);
  const [draftName, setDraftName] = useState<string>('');
  const [businessPlanForm, setBusinessPlanForm] = useState<BusinessPlanFormState | null>(null);
  const [businessPlanMessage, setBusinessPlanMessage] = useState<BusinessPlanMessage | null>(null);

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    // Base range: current year - 5 to current year + 1
    const _baseYears = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
    
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
    
    // Use yearMetrics to determine complete years - if yearMetrics has data for a year, consider it complete
    yearMetrics.forEach((metrics, year) => {
      // Consider a year complete if it has non-zero values
      if (metrics.fatturatoTotale > 0 || metrics.incassato > 0 || metrics.costiFissi > 0 || metrics.costiVariabili > 0) {
        years.push(year);
      }
    });
    
    return years.sort((a, b) => a - b);
  }, [yearMetrics]);

  // Load drafts from database
  useEffect(() => {
    if (locationId) {
      fetchBusinessPlanDrafts(locationId).then(setBusinessPlanDrafts);
    }
  }, [locationId]);


  // Initialize form
  useEffect(() => {
    // Non eseguire se yearMetrics è vuoto o se il form è già stato inizializzato
    if (yearMetrics.size === 0 || businessPlanForm) {
      return;
    }
    
    const defaultBaseYear =
      completeYears.length > 0
        ? completeYears[completeYears.length - 1]
        : currentYear;
    const defaultTarget = defaultBaseYear + 1;
    
    const metrics = yearMetrics.get(defaultBaseYear);
    
    // Find draft for the target year (take the first one if multiple exist)
    const stored = businessPlanDrafts.find(draft => draft.targetYear === defaultTarget);
    const form = stored
      ? createBusinessPlanFormFromDraft(stored.data)
      : createBusinessPlanFormFromMetrics(metrics, defaultBaseYear, defaultTarget);
    
    // Inizializza il form senza ricalcolo automatico
    setBusinessPlanForm(form);
  }, [
    businessPlanDrafts,
    completeYears,
    currentYear,
    yearMetrics,
    businessPlanForm,
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
        case 'fatturatoIncrement': {
          next.fatturatoIncrement = value;
          // Calculate fatturato previsionale from increment
          const fatturatoAnnoBase = parseNumberInput(next.fatturatoAnnoBase) ?? 0;
          const increment = parseNumberInput(value) ?? 0;
          next.fatturatoPrevisionale = (fatturatoAnnoBase * (1 + increment / 100)).toFixed(2);
          break;
        }
        case 'fatturatoValue': {
          next.fatturatoPrevisionale = cleanCurrencyValue(value);
          // Calculate increment from fatturato previsionale
          const fatturatoAnnoBaseForIncrement = parseNumberInput(next.fatturatoAnnoBase) ?? 0;
          const fatturatoPrevisionaleValue = parseNumberInput(cleanCurrencyValue(value)) ?? 0;
          next.fatturatoIncrement = fatturatoAnnoBaseForIncrement === 0 ? '0.00' : ((fatturatoPrevisionaleValue / fatturatoAnnoBaseForIncrement - 1) * 100).toFixed(2);
          break;
        }
        case 'incassatoPercent': {
          next.incassatoPercent = value;
          // Calculate incassato value from percentage
          const fatturatoPrevisionale = parseNumberInput(next.fatturatoPrevisionale) ?? 0;
          const incassatoPercent = parseNumberInput(value) ?? 0;
          next.incassatoPrevisionale = (fatturatoPrevisionale * incassatoPercent / 100).toFixed(2);
          break;
        }
        case 'incassatoValue': {
          next.incassatoPrevisionale = cleanCurrencyValue(value);
          // Calculate percentage from incassato value
          const fatturatoPrevisionaleForPercent = parseNumberInput(next.fatturatoPrevisionale) ?? 0;
          const incassatoValue = parseNumberInput(cleanCurrencyValue(value)) ?? 0;
          next.incassatoPercent = fatturatoPrevisionaleForPercent === 0 ? '0.00' : (incassatoValue / fatturatoPrevisionaleForPercent * 100).toFixed(2);
          break;
        }
        case 'costiFissiPercent': {
          next.costiFissiPercent = value;
          // Calculate costi fissi value from percentage
          const incassatoPrevisionale = parseNumberInput(next.incassatoPrevisionale) ?? 0;
          const costiFissiPercent = parseNumberInput(value) ?? 0;
          next.costiFissiPrevisionale = (incassatoPrevisionale * costiFissiPercent / 100).toFixed(2);
          break;
        }
        case 'costiFissiValue': {
          next.costiFissiPrevisionale = cleanCurrencyValue(value);
          // Calculate percentage from costi fissi value
          const incassatoPrevisionaleForCostiFissi = parseNumberInput(next.incassatoPrevisionale) ?? 0;
          const costiFissiValue = parseNumberInput(cleanCurrencyValue(value)) ?? 0;
          next.costiFissiPercent = incassatoPrevisionaleForCostiFissi === 0 ? '0.00' : (costiFissiValue / incassatoPrevisionaleForCostiFissi * 100).toFixed(2);
          break;
        }
        case 'costiVariabiliPercent': {
          next.costiVariabiliPercent = value;
          // Calculate costi variabili value from percentage
          const incassatoPrevisionaleForVariabili = parseNumberInput(next.incassatoPrevisionale) ?? 0;
          const costiVariabiliPercent = parseNumberInput(value) ?? 0;
          next.costiVariabiliPrevisionale = (incassatoPrevisionaleForVariabili * costiVariabiliPercent / 100).toFixed(2);
          break;
        }
        case 'costiVariabiliValue': {
          next.costiVariabiliPrevisionale = cleanCurrencyValue(value);
          // Calculate percentage from costi variabili value
          const incassatoPrevisionaleForCostiVariabili = parseNumberInput(next.incassatoPrevisionale) ?? 0;
          const costiVariabiliValue = parseNumberInput(cleanCurrencyValue(value)) ?? 0;
          next.costiVariabiliPercent = incassatoPrevisionaleForCostiVariabili === 0 ? '0.00' : (costiVariabiliValue / incassatoPrevisionaleForCostiVariabili * 100).toFixed(2);
          break;
        }
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
    
    // Ricalcolo automatico al cambio anno base
    const recalculatedForm = recalcBusinessPlan(form, yearMetrics);
    setBusinessPlanForm(recalculatedForm);
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
      // Find draft for the target year (take the first one if multiple exist)
      const stored = businessPlanDrafts.find(draft => draft.targetYear === targetYear);
      if (stored && stored.data.baseYear === prev.baseYear) {
        // Ricalcolo automatico anche per i draft salvati
        const recalculatedForm = recalcBusinessPlan(createBusinessPlanFormFromDraft(stored.data), yearMetrics);
        return recalculatedForm;
      }
      // Ricalcolo automatico per il nuovo anno target
      const updatedForm = { ...prev, targetYear };
      const recalculatedForm = recalcBusinessPlan(updatedForm, yearMetrics);
      return recalculatedForm;
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
    
    if (!draftName.trim()) {
      setBusinessPlanMessage({
        type: 'error',
        text: 'Inserisci un nome per la bozza prima di salvare.',
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
      saveBusinessPlanDraft(draft.targetYear, draftName.trim(), draft, locationId)
        .then(() => {
          // Reload drafts from database
          fetchBusinessPlanDrafts(locationId).then(drafts => {
            setBusinessPlanDrafts(drafts);
          });
          setBusinessPlanForm(normalized);
          setBusinessPlanMessage({
            type: 'success',
            text: `Bozza "${draftName}" salvata per l'anno ${normalized.targetYear}.`,
          });
          setDraftName(''); // Clear the name field
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

  const handleDeleteBusinessPlanDraft = useCallback((draftId: string) => {
    if (!locationId) return;
    
    deleteBusinessPlanDraft(draftId, locationId)
      .then(() => {
        // Reload drafts from database
        fetchBusinessPlanDrafts(locationId).then(drafts => {
          setBusinessPlanDrafts(drafts);
        });
        setBusinessPlanMessage({
          type: 'info',
          text: 'Bozza eliminata con successo.',
        });
      })
      .catch(() => {
        setBusinessPlanMessage({
          type: 'error',
          text: 'Errore nell\'eliminazione della bozza.',
        });
      });
  }, [locationId]);

  const clearBusinessPlanMessage = useCallback(() => {
    setBusinessPlanMessage(null);
  }, []);

  const handleLoadDraft = useCallback((draftData: any) => {
    const form = createBusinessPlanFormFromDraft(draftData);
    setBusinessPlanForm(form);
    setBusinessPlanMessage({
      type: 'info',
      text: 'Bozza caricata nel form.',
    });
  }, []);

  return {
    // State
    businessPlanDrafts,
    businessPlanForm,
    businessPlanMessage,
    availableYears,
    completeYears,
    draftName,
    setDraftName,
    
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
    handleLoadDraft,
  };
};
