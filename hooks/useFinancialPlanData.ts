// Financial Plan Data Hook
// Manages financial plan data, overrides, and calculations

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchFinancialPlanState, persistFinancialPlanState, fetchFinancialStats, saveFinancialStats, type FinancialPlanStatePayload } from '../services/financialPlanApi';
import { financialCausali } from '../data/financialPlanData';
import type { FinancialCausaleGroup } from '../data/financialPlanData';
import type { PlanOverrides, StatsOverrides } from '../types';
import { computePlanData, computeYearMetrics } from '../utils/financialCalculations';
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
  const [loadingState, setLoadingState] = useState<boolean>(false);
  const [savingState, setSavingState] = useState<boolean>(false);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [causaliCatalog, setCausaliCatalog] = useState<FinancialCausaleGroup[]>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<any[]>([]);
  const [financialStatsRows, setFinancialStatsRows] = useState<any[]>([]);
  
  // Database-backed overrides (loaded from database, no local state)
  const [dbPlanOverrides, setDbPlanOverrides] = useState<PlanOverrides>({});
  const [dbConsuntivoOverrides, setDbConsuntivoOverrides] = useState<PlanOverrides>({});
  const [dbStatsOverrides, setDbStatsOverrides] = useState<StatsOverrides>({});
  
  // Load data entries sums for Piano Mensile
  const { getSumForCausale } = useDataEntriesSums(locationId);

  // Calculate available years with fixed range
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
  }, []);

  const basePlanByYear = useMemo(() => {
    const source = causaliCatalog.length > 0 ? causaliCatalog : DEFAULT_CAUSALI_CATALOG;
    return computePlanData(source, availableYears);
  }, [causaliCatalog, availableYears]);

  const getPlanConsuntivoValue = useCallback(
    (
      macro: string,
      category: string,
      detail: string,
      year: number,
      monthIndex: number,
    ): number => {
      const monthKey = buildMonthKey(year, monthIndex);
      const override = dbConsuntivoOverrides[macro]?.[category]?.[detail]?.[monthKey];
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
    [dbConsuntivoOverrides, basePlanByYear, getSumForCausale],
  );

  const yearMetrics = useMemo(
    () => computeYearMetrics(basePlanByYear, financialStatsRows, dbStatsOverrides, getPlanConsuntivoValue),
    [basePlanByYear, financialStatsRows, dbStatsOverrides, getPlanConsuntivoValue],
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
        setDbPlanOverrides(payload.preventivoOverrides ?? {});
        setDbConsuntivoOverrides((payload as FinancialPlanStatePayload).consuntivoOverrides ?? {});
        setDbStatsOverrides(payload.statsOverrides ?? {});
        setMonthlyMetrics(payload.monthlyMetrics ?? []);
        setCausaliCatalog(() => normalizeCausaliCatalog((payload.causaliCatalog && payload.causaliCatalog.length > 0) ? (payload.causaliCatalog as FinancialCausaleGroup[]) : DEFAULT_CAUSALI_CATALOG));
      }
      
      // Set financial stats data (use ONLY database data, no fallback)
      setFinancialStatsRows(stats || []);
      
      setLoadingState(false);
      setDataLoaded(true);
    }).catch(() => {
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
      const override = dbPlanOverrides[macro]?.[category]?.[detail]?.[monthKey];
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
    [dbPlanOverrides, basePlanByYear],
  );

  const setOverride = useCallback(async (
    target: 'preventivo' | 'consuntivo',
    macro: string,
    category: string,
    detail: string,
    year: number,
    monthIndex: number,
    value: number | null,
  ) => {
    if (!locationId) return;
    
    const monthKey = buildMonthKey(year, monthIndex);
    
    // Update local state immediately for UI responsiveness
    const setter = target === 'preventivo' ? setDbPlanOverrides : setDbConsuntivoOverrides;
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
    
    // Save to database immediately
    try {
      const currentPlanOverrides = target === 'preventivo' ? 
        { ...dbPlanOverrides, [macro]: { ...dbPlanOverrides[macro], [category]: { ...dbPlanOverrides[macro]?.[category], [detail]: { ...dbPlanOverrides[macro]?.[category]?.[detail], [monthKey]: value } } } } :
        dbPlanOverrides;
      const currentConsuntivoOverrides = target === 'consuntivo' ? 
        { ...dbConsuntivoOverrides, [macro]: { ...dbConsuntivoOverrides[macro], [category]: { ...dbConsuntivoOverrides[macro]?.[category], [detail]: { ...dbConsuntivoOverrides[macro]?.[category]?.[detail], [monthKey]: value } } } } :
        dbConsuntivoOverrides;
      
      const payload: FinancialPlanStatePayload = {
        preventivoOverrides: currentPlanOverrides,
        consuntivoOverrides: currentConsuntivoOverrides,
        manualLog: [],
        monthlyMetrics: monthlyMetrics,
        statsOverrides: dbStatsOverrides,
        causaliCatalog: causaliCatalog,
        causaliVersion: null,
      };
      
      await persistFinancialPlanState(payload, locationId);
    } catch (error) {
      console.error('Failed to save override to database:', error);
    }
  }, [locationId, dbPlanOverrides, dbConsuntivoOverrides, dbStatsOverrides, monthlyMetrics, causaliCatalog]);

  const handleSavePlan = useCallback(async (selectedYear: number, _dirtyKeys: Set<string>) => {
    if (!locationId) return false;
    
    setSavingState(true);
    try {
      // Build audit log entries for changed overrides in the selected year only
      const buildAudit = (target: 'preventivo' | 'consuntivo'): { id: string; createdAt: string; year: number; month: number; macroCategory: string; category: string; causale: string; value: number }[] => {
        const out: any[] = [];
        const source = target === 'preventivo' ? dbPlanOverrides : dbConsuntivoOverrides;
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
        preventivoOverrides: dbPlanOverrides,
        consuntivoOverrides: dbConsuntivoOverrides,
        manualLog: [...buildAudit('preventivo'), ...buildAudit('consuntivo')],
        monthlyMetrics: monthlyMetrics,
        statsOverrides: dbStatsOverrides,
        causaliCatalog: causaliCatalog,
        causaliVersion: null,
      };
      await persistFinancialPlanState(payload, locationId);
      
      // Convert statsOverrides to FinancialStatsRow format and save
      const statsToSave = convertStatsOverridesToRows(dbStatsOverrides, selectedYear);
      await saveFinancialStats(locationId, statsToSave);
      
      return true;
    } finally {
      setSavingState(false);
    }
  }, [dbPlanOverrides, dbConsuntivoOverrides, dbStatsOverrides, causaliCatalog, monthlyMetrics, locationId]);

  const handleCancelPlan = useCallback(async () => {
    if (!locationId) return false;
    
    setLoadingState(true);
    try {
      const [payload, stats] = await Promise.all([
        fetchFinancialPlanState(locationId),
        fetchFinancialStats(locationId)
      ]);
      
      if (payload) {
        setDbPlanOverrides(payload.preventivoOverrides ?? {});
        setDbConsuntivoOverrides((payload as FinancialPlanStatePayload | null)?.consuntivoOverrides ?? {});
        setDbStatsOverrides(payload.statsOverrides ?? {});
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
        preventivoOverrides: dbPlanOverrides,
        consuntivoOverrides: dbConsuntivoOverrides,
        manualLog: [],
        monthlyMetrics: monthlyMetrics,
        statsOverrides: dbStatsOverrides,
        causaliCatalog: normalizedCatalog,
        causaliVersion: String(Date.now()),
      };
      await persistFinancialPlanState(payload, locationId);
      
      // Convert statsOverrides to FinancialStatsRow format and save
      const currentYear = new Date().getFullYear();
      const statsToSave = convertStatsOverridesToRows(dbStatsOverrides, currentYear);
      await saveFinancialStats(locationId, statsToSave);
      
      setCausaliCatalog(normalizedCatalog);
      return true;
    } finally {
      setSavingState(false);
    }
  }, [dbPlanOverrides, dbConsuntivoOverrides, dbStatsOverrides, monthlyMetrics, financialStatsRows, locationId]);

  const handleSaveMetrics = useCallback(async (metricsData: any) => {
    if (!locationId) return false;
    
    setSavingState(true);
    try {
      const updatedMetrics = [...monthlyMetrics, metricsData];
      const payload: FinancialPlanStatePayload = {
        preventivoOverrides: dbPlanOverrides,
        consuntivoOverrides: dbConsuntivoOverrides,
        manualLog: [],
        monthlyMetrics: updatedMetrics,
        statsOverrides: dbStatsOverrides,
        causaliCatalog: causaliCatalog,
        causaliVersion: null,
      };
      await persistFinancialPlanState(payload, locationId);
      
      // Convert statsOverrides to FinancialStatsRow format and save
      const currentYear = new Date().getFullYear();
      const statsToSave = convertStatsOverridesToRows(dbStatsOverrides, currentYear);
      await saveFinancialStats(locationId, statsToSave);
      
      setMonthlyMetrics(updatedMetrics);
      return true;
    } finally {
      setSavingState(false);
    }
  }, [dbPlanOverrides, dbConsuntivoOverrides, dbStatsOverrides, causaliCatalog, monthlyMetrics, locationId]);

  // Wrapper function for setStatsOverrides that saves to database
  const setStatsOverrides = useCallback(async (newStatsOverrides: StatsOverrides) => {
    if (!locationId) return;
    
    // Update local state immediately
    setDbStatsOverrides(newStatsOverrides);
    
    // Save to database
    try {
      const payload: FinancialPlanStatePayload = {
        preventivoOverrides: dbPlanOverrides,
        consuntivoOverrides: dbConsuntivoOverrides,
        manualLog: [],
        monthlyMetrics: monthlyMetrics,
        statsOverrides: newStatsOverrides as unknown as Record<string, Partial<Record<string, number | null>>>,
        causaliCatalog: causaliCatalog,
        causaliVersion: null,
      };
      
      await persistFinancialPlanState(payload, locationId);
      
      // Also save to financial_stats table
      const currentYear = new Date().getFullYear();
      const statsToSave = convertStatsOverridesToRows(newStatsOverrides, currentYear);
      await saveFinancialStats(locationId, statsToSave);
    } catch (error) {
      console.error('Failed to save stats overrides to database:', error);
    }
  }, [locationId, dbPlanOverrides, dbConsuntivoOverrides, monthlyMetrics, causaliCatalog]);

  return {
    // State
    planOverrides: dbPlanOverrides,
    consuntivoOverrides: dbConsuntivoOverrides,
    statsOverrides: dbStatsOverrides,
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
    availableYears,
    getPlanPreventivoValue,
    getPlanConsuntivoValue,
  };
};

