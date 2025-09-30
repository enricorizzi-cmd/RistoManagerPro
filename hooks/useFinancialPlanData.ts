// Financial Plan Data Hook
// Manages financial plan data, overrides, and calculations

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchFinancialPlanState, persistFinancialPlanState, type FinancialPlanStatePayload } from '../services/financialPlanApi';
import { financialCausali, financialStats as financialStatsRows } from '../data/financialPlanData';
import type { FinancialCausaleGroup } from '../data/financialPlanData';
import type { PlanOverrides, StatsOverrides } from '../types';
import { computePlanData, computeYearMetrics, type PlanYearData, type BusinessPlanYearMetrics } from '../utils/financialCalculations';
import { buildMonthKey, normalizeLabel, parseMonthKey } from '../utils/financialPlanUtils';

const DEFAULT_CAUSALI_CATALOG: FinancialCausaleGroup[] = (financialCausali as unknown as FinancialCausaleGroup[]);

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

export const useFinancialPlanData = () => {
  const [planOverrides, setPlanOverrides] = useState<PlanOverrides>({});
  const [consuntivoOverrides, setConsuntivoOverrides] = useState<PlanOverrides>({});
  const [statsOverrides, setStatsOverrides] = useState<StatsOverrides>({});
  const [loadingState, setLoadingState] = useState<boolean>(false);
  const [savingState, setSavingState] = useState<boolean>(false);
  const [causaliCatalog, setCausaliCatalog] = useState<FinancialCausaleGroup[]>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<any[]>([]);

  const basePlanByYear = useMemo(() => {
    const source = causaliCatalog.length > 0 ? causaliCatalog : DEFAULT_CAUSALI_CATALOG;
    return computePlanData(source);
  }, [causaliCatalog]);

  const yearMetrics = useMemo(
    () => computeYearMetrics(basePlanByYear, [...financialStatsRows]),
    [basePlanByYear],
  );

  useEffect(() => {
    let mounted = true;
    setLoadingState(true);
    fetchFinancialPlanState().then((payload) => {
      if (!mounted || !payload) {
        setLoadingState(false);
        return;
      }
      setPlanOverrides(payload.preventivoOverrides ?? {});
      setConsuntivoOverrides((payload as FinancialPlanStatePayload).consuntivoOverrides ?? {});
      setStatsOverrides(payload.statsOverrides ?? {});
      setMonthlyMetrics(payload.monthlyMetrics ?? []);
      setCausaliCatalog(() => normalizeCausaliCatalog((payload.causaliCatalog && payload.causaliCatalog.length > 0) ? (payload.causaliCatalog as FinancialCausaleGroup[]) : DEFAULT_CAUSALI_CATALOG));
      setLoadingState(false);
    }).catch(() => setLoadingState(false));
    return () => { mounted = false; };
  }, []);

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
      const planYear = basePlanByYear.get(year);
      const macroBlock = planYear?.macros.find(
        (item) => normalizeLabel(item.macro) === normalizeLabel(macro),
      );
      const detailRow = macroBlock?.details.find(
        (item) => normalizeLabel(item.detail) === normalizeLabel(detail),
      );
      return detailRow?.months[monthIndex].consuntivo ?? 0;
    },
    [consuntivoOverrides, basePlanByYear],
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
      await persistFinancialPlanState(payload);
      return true;
    } finally {
      setSavingState(false);
    }
  }, [planOverrides, consuntivoOverrides, statsOverrides, causaliCatalog, monthlyMetrics]);

  const handleCancelPlan = useCallback(async () => {
    setLoadingState(true);
    try {
      const payload = await fetchFinancialPlanState();
      if (payload) {
        setPlanOverrides(payload.preventivoOverrides ?? {});
        setConsuntivoOverrides((payload as FinancialPlanStatePayload | null)?.consuntivoOverrides ?? {});
        setStatsOverrides(payload.statsOverrides ?? {});
        setMonthlyMetrics(payload.monthlyMetrics ?? []);
        setCausaliCatalog(() => normalizeCausaliCatalog((payload && payload.causaliCatalog && payload.causaliCatalog.length > 0) ? (payload.causaliCatalog as FinancialCausaleGroup[]) : DEFAULT_CAUSALI_CATALOG));
      }
      return true;
    } catch (error) {
      console.error('Failed to cancel plan:', error);
      return false;
    } finally {
      setLoadingState(false);
    }
  }, []);

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
      await persistFinancialPlanState(payload);
      setCausaliCatalog(normalizedCatalog);
      return true;
    } finally {
      setSavingState(false);
    }
  }, [planOverrides, consuntivoOverrides, statsOverrides, monthlyMetrics]);

  const handleSaveMetrics = useCallback(async (metricsData: any) => {
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
      await persistFinancialPlanState(payload);
      setMonthlyMetrics(updatedMetrics);
      return true;
    } finally {
      setSavingState(false);
    }
  }, [planOverrides, consuntivoOverrides, statsOverrides, causaliCatalog, monthlyMetrics]);

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

