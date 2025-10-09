// Financial Plan Data Hook
// Manages financial plan data, overrides, and calculations

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchFinancialPlanState, persistFinancialPlanState, fetchFinancialStats, saveFinancialStats, type FinancialPlanStatePayload } from '../services/financialPlanApi';
import { financialCausali } from '../data/financialPlanData';
import type { FinancialCausaleGroup } from '../data/financialPlanData';
import type { PlanOverrides, StatsOverrides } from '../types';
import { computePlanData, computeYearMetrics, type PlanYearData, type BusinessPlanYearMetrics } from '../utils/financialCalculations';
import { buildMonthKey, normalizeLabel, parseMonthKey } from '../utils/financialPlanUtils';
import { useDataEntriesSums } from './useDataEntriesSums';

const DEFAULT_CAUSALI_CATALOG: FinancialCausaleGroup[] = (financialCausali as unknown as FinancialCausaleGroup[]);

// Convert statsOverrides to FinancialStatsRow format
const convertStatsOverridesToRows = (statsOverrides: StatsOverrides, selectedYear: number): any[] => {
  const statsRows: any[] = [];
  const monthNames = ['Gen.', 'Feb.', 'Mar.', 'Apr.', 'Mag.', 'Giu.', 'Lug.', 'Ago.', 'Set.', 'Ott.', 'Nov.', 'Dic.'];
  
  // Group overrides by month
  const monthData = new Map<string, any>();
  
  Object.entries(statsOverrides).forEach(([key, value]) => {
    const [monthKey, field] = key.split('|');
    if (!monthKey || !field) return;
    
    const parsed = parseMonthKey(monthKey);
    if (!parsed || parsed.year !== selectedYear) return;
    
    if (!monthData.has(monthKey)) {
      monthData.set(monthKey, {
        month: `${monthNames[parsed.monthIndex]} ${parsed.year.toString().slice(-2)}`,
        year: parsed.year,
        monthIndex: parsed.monthIndex
      });
    }
    
    monthData.get(monthKey)[field] = value;
  });
  
  // Convert to array and sort by month
  monthData.forEach((data) => {
    statsRows.push(data);
  });
  
  return statsRows.sort((a, b) => a.monthIndex - b.monthIndex);
};

const normalizeCausaliCatalog = (catalog: FinancialCausaleGroup[]): FinancialCausaleGroup[] => {
  const defaultMap = new Map(
    DEFAULT_CAUSALI_CATALOG.map((group) => [normalizeLabel(group.macroCategory), group.macroId]),
  );

  const existingIds = catalog
    .map((group) => group?.macroId)
    .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id) && id > 0);

  const defaultIds = Array.from(defaultMap.values()).filter(
    (id): id is number => typeof id === 'number' && !Number.isNaN(id) && id > 0,
  );

  let nextId = Math.max(0, ...existingIds, ...defaultIds);

  return catalog.map((group) => {
    const normalizedName = normalizeLabel(group.macroCategory);
    let macroId =
      typeof group.macroId === 'number' && !Number.isNaN(group.macroId) && group.macroId > 0
        ? group.macroId
        : defaultMap.get(normalizedName);

    if (!macroId) {
      nextId += 1;
      macroId = nextId;
    }

    return {
      ...group,
      macroId,
      categories: (group.categories ?? []).map((category) => ({
        ...category,
        items: Array.isArray(category.items) ? [...category.items] : [],
      })),
    };
  });
};

export const useFinancialPlanData = (locationId?: string) => {
  const [planOverrides, setPlanOverrides] = useState<PlanOverrides>({});
  const [consuntivoOverrides, setConsuntivoOverrides] = useState<PlanOverrides>({});
  const [statsOverrides, setStatsOverrides] = useState<StatsOverrides>({});
  const [loadingState, setLoadingState] = useState<boolean>(false);
  const [savingState, setSavingState] = useState<boolean>(false);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [causaliCatalog, setCausaliCatalog] = useState<FinancialCausaleGroup[]>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<any[]>([]);
  const [financialStatsRows, setFinancialStatsRows] = useState<any[]>([]);
  
  // Load data entries sums for Piano Mensile
  const { getSumForCausale } = useDataEntriesSums(locationId);

  const basePlanByYear = useMemo(() => {
    const source = causaliCatalog.length > 0 ? causaliCatalog : DEFAULT_CAUSALI_CATALOG;
    return computePlanData(source);
  }, [causaliCatalog]);

  const getPlanConsuntivoValue = useCallback(
    (
      macro: string,
      category: string,
      detail: string,
      year: number,
      monthIndex: number,
    ): number => {
      const monthKey = buildMonthKey(year, monthIndex);
      const override = consuntivoOverrides[macro]?.[category]?.[detail]?.[monthKey];
      if (override !== undefined) {
        return override;
      }
      
      // Get sum from data entries (InserisciDati)
      const dataEntriesSum = getSumForCausale(macro, category, detail, year, monthIndex);
      if (dataEntriesSum !== 0) {
        return dataEntriesSum;
      }
      
      const planYear = basePlanByYear.get(year);
      const macroBlock = planYear?.macros.find(
        (item) => normalizeLabel(item.macro) === normalizeLabel(macro),
      );
      const detailRow = macroBlock?.details.find(
        (item) => normalizeLabel(item.detail) === normalizeLabel(detail),
      );
      return detailRow?.months[monthIndex].consuntivo ?? 0;
    },
    [consuntivoOverrides, basePlanByYear, getSumForCausale],
  );

  const yearMetrics = useMemo(
    () => computeYearMetrics(basePlanByYear, financialStatsRows, statsOverrides, getPlanConsuntivoValue),
    [basePlanByYear, financialStatsRows, statsOverrides, getPlanConsuntivoValue],
  );

  // Reset dataLoaded when locationId changes
  useEffect(() => {
    setDataLoaded(false);
  }, [locationId]);

  useEffect(() => {
    if (!locationId || dataLoaded) return;
    
    
    let mounted = true;
    setLoadingState(true);
    
    // Load both financial plan state and financial stats
    Promise.all([
      fetchFinancialPlanState(locationId),
      fetchFinancialStats(locationId)
    ]).then(([payload, stats]) => {
      if (!mounted) {
        setLoadingState(false);
        return;
      }
      
      // Set financial plan data
      if (payload) {
        setPlanOverrides(payload.preventivoOverrides ?? {});
        setConsuntivoOverrides((payload as FinancialPlanStatePayload).consuntivoOverrides ?? {});
        setStatsOverrides(payload.statsOverrides ?? {});
        setMonthlyMetrics(payload.monthlyMetrics ?? []);
        setCausaliCatalog(() => normalizeCausaliCatalog((payload.causaliCatalog && payload.causaliCatalog.length > 0) ? (payload.causaliCatalog as FinancialCausaleGroup[]) : DEFAULT_CAUSALI_CATALOG));
      }
      
      // Set financial stats data (use ONLY database data, no fallback)
      setFinancialStatsRows(stats || []);
      
      setLoadingState(false);
      setDataLoaded(true);
    }).catch((error) => {
      // If API fails, use empty array (NO fallback to static data)
      setFinancialStatsRows([]);
      setLoadingState(false);
    });
    
    return () => { mounted = false; };
  }, [locationId, dataLoaded]);

  const getPlanPreventivoValue = useCallback(
    (
      macro: string,
      category: string,
      detail: string,
      year: number,
      monthIndex: number,
    ): number => {
      const monthKey = buildMonthKey(year, monthIndex);
      const override = planOverrides[macro]?.[category]?.[detail]?.[monthKey];
      if (override !== undefined) {
        return override;
      }
      const planYear = basePlanByYear.get(year);
      const macroBlock = planYear?.macros.find(
        (item) => normalizeLabel(item.macro) === normalizeLabel(macro),
      );
      const detailRow = macroBlock?.details.find(
        (item) => normalizeLabel(item.detail) === normalizeLabel(detail),
      );
      return detailRow?.months[monthIndex].preventivo ?? 0;
    },
    [planOverrides, basePlanByYear],
  );

  const setOverride = useCallback((
    target: 'preventivo' | 'consuntivo',
    macro: string,
    category: string,
    detail: string,
    year: number,
    monthIndex: number,
    value: number | null,
  ) => {
    const monthKey = buildMonthKey(year, monthIndex);
    const setter = target === 'preventivo' ? setPlanOverrides : setConsuntivoOverrides;
    setter((prev) => {
      const next = { ...prev } as PlanOverrides;
      if (!next[macro]) next[macro] = {} as any;
      if (!next[macro][category]) next[macro][category] = {} as any;
      if (!next[macro][category][detail]) next[macro][category][detail] = {} as any;
      if (value === null) {
        delete next[macro][category][detail][monthKey];
      } else {
        // Per i consuntivi, somma i valori invece di sovrascriverli
        if (target === 'consuntivo') {
          const existingValue = next[macro][category][detail][monthKey] || 0;
          next[macro][category][detail][monthKey] = existingValue + value;
        } else {
          // Per i preventivi, mantieni il comportamento originale (sovrascrittura)
          next[macro][category][detail][monthKey] = value;
        }
      }
      return { ...next };
    });
  }, []);

  const handleSavePlan = useCallback(async (selectedYear: number, dirtyKeys: Set<string>) => {
    if (!locationId) return false;
    
    setSavingState(true);
    try {
      // Build audit log entries for changed overrides in the selected year only
      const buildAudit = (target: 'preventivo' | 'consuntivo'): { id: string; createdAt: string; year: number; month: number; macroCategory: string; category: string; causale: string; value: number }[] => {
        const out: any[] = [];
        const source = target === 'preventivo' ? planOverrides : consuntivoOverrides;
        Object.entries(source).forEach(([macro, categories]) => {
          Object.entries(categories).forEach(([category, details]) => {
            Object.entries(details).forEach(([detail, months]) => {
              Object.entries(months).forEach(([monthKey, value]) => {
                const parsed = parseMonthKey(monthKey);
                if (!parsed) return;
                if (parsed.year !== selectedYear) return;
                out.push({
                  id: `${target}-${macro}-${category}-${detail}-${monthKey}`,
                  createdAt: new Date().toISOString(),
                  year: parsed.year,
                  month: parsed.monthIndex + 1,
                  macroCategory: macro,
                  category,
                  causale: detail,
                  value,
                });
              });
            });
          });
        });
        return out;
      };

      const payload: FinancialPlanStatePayload = {
        preventivoOverrides: planOverrides,
        consuntivoOverrides: consuntivoOverrides,
        manualLog: [...buildAudit('preventivo'), ...buildAudit('consuntivo')],
        monthlyMetrics: monthlyMetrics,
        statsOverrides,
        causaliCatalog: causaliCatalog,
        causaliVersion: null,
      };
      await persistFinancialPlanState(payload, locationId);
      
      // Convert statsOverrides to FinancialStatsRow format and save
      const statsToSave = convertStatsOverridesToRows(statsOverrides, selectedYear);
      await saveFinancialStats(locationId, statsToSave);
      
      return true;
    } finally {
      setSavingState(false);
    }
  }, [planOverrides, consuntivoOverrides, statsOverrides, causaliCatalog, monthlyMetrics, financialStatsRows, locationId]);

  const handleCancelPlan = useCallback(async () => {
    if (!locationId) return false;
    
    setLoadingState(true);
    try {
      const [payload, stats] = await Promise.all([
        fetchFinancialPlanState(locationId),
        fetchFinancialStats(locationId)
      ]);
      
      if (payload) {
        setPlanOverrides(payload.preventivoOverrides ?? {});
        setConsuntivoOverrides((payload as FinancialPlanStatePayload | null)?.consuntivoOverrides ?? {});
        setStatsOverrides(payload.statsOverrides ?? {});
        setMonthlyMetrics(payload.monthlyMetrics ?? []);
        setCausaliCatalog(() => normalizeCausaliCatalog((payload && payload.causaliCatalog && payload.causaliCatalog.length > 0) ? (payload.causaliCatalog as FinancialCausaleGroup[]) : DEFAULT_CAUSALI_CATALOG));
      }
      
      // Reload financial stats (ONLY from database)
      setFinancialStatsRows(stats || []);
      
      return true;
    } catch (error) {
      console.error('Failed to cancel plan:', error);
      return false;
    } finally {
      setLoadingState(false);
    }
  }, [locationId]);

  const handleCausaliPersist = useCallback(async (next: FinancialCausaleGroup[]) => {
    setSavingState(true);
    try {
      const normalizedCatalog = normalizeCausaliCatalog(next);
      const payload: FinancialPlanStatePayload = {
        preventivoOverrides: planOverrides,
        consuntivoOverrides: consuntivoOverrides,
        manualLog: [],
        monthlyMetrics: monthlyMetrics,
        statsOverrides,
        causaliCatalog: normalizedCatalog,
        causaliVersion: String(Date.now()),
      };
      await persistFinancialPlanState(payload, locationId);
      
      // Convert statsOverrides to FinancialStatsRow format and save
      const currentYear = new Date().getFullYear();
      const statsToSave = convertStatsOverridesToRows(statsOverrides, currentYear);
      await saveFinancialStats(locationId, statsToSave);
      
      setCausaliCatalog(normalizedCatalog);
      return true;
    } finally {
      setSavingState(false);
    }
  }, [planOverrides, consuntivoOverrides, statsOverrides, monthlyMetrics, financialStatsRows, locationId]);

  const handleSaveMetrics = useCallback(async (metricsData: any) => {
    if (!locationId) return false;
    
    setSavingState(true);
    try {
      const updatedMetrics = [...monthlyMetrics, metricsData];
      const payload: FinancialPlanStatePayload = {
        preventivoOverrides: planOverrides,
        consuntivoOverrides: consuntivoOverrides,
        manualLog: [],
        monthlyMetrics: updatedMetrics,
        statsOverrides,
        causaliCatalog: causaliCatalog,
        causaliVersion: null,
      };
      await persistFinancialPlanState(payload, locationId);
      
      // Convert statsOverrides to FinancialStatsRow format and save
      const currentYear = new Date().getFullYear();
      const statsToSave = convertStatsOverridesToRows(statsOverrides, currentYear);
      await saveFinancialStats(locationId, statsToSave);
      
      setMonthlyMetrics(updatedMetrics);
      return true;
    } finally {
      setSavingState(false);
    }
  }, [planOverrides, consuntivoOverrides, statsOverrides, causaliCatalog, monthlyMetrics, financialStatsRows, locationId]);

  return {
    // State
    planOverrides,
    consuntivoOverrides,
    statsOverrides,
    loadingState,
    savingState,
    causaliCatalog,
    monthlyMetrics,
    basePlanByYear,
    yearMetrics,
    financialStatsRows,
    
    // Actions
    setOverride,
    setStatsOverrides,
    handleSavePlan,
    handleCancelPlan,
    handleCausaliPersist,
    handleSaveMetrics,
    getPlanPreventivoValue,
    getPlanConsuntivoValue,
  };
};

