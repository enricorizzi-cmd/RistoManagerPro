import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  financialPlanRows,
  financialCausali,
  financialStats as financialStatsRows,
  FinancialCausaleGroup,
  FinancialStatsRow,
} from '../data/financialPlanData';

const MONTH_NAMES = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

const MONTH_SHORT = [
  'Gen',
  'Feb',
  'Mar',
  'Apr',
  'Mag',
  'Giu',
  'Lug',
  'Ago',
  'Set',
  'Ott',
  'Nov',
  'Dic',
];

const MONTH_MAP: Record<string, number> = {
  GENNAIO: 0,
  FEBBRAIO: 1,
  MARZO: 2,
  APRILE: 3,
  MAGGIO: 4,
  GIUGNO: 5,
  LUGLIO: 6,
  AGOSTO: 7,
  SETTEMBRE: 8,
  OTTOBRE: 9,
  NOVEMBRE: 10,
  DICEMBRE: 11,
};

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const round2 = (value: number): number => Math.round(value * 100) / 100;

const normalizeLabel = (value: string): string => value.trim().toUpperCase();

const parsePlanMonthLabel = (
  label: string,
): { year: number; monthIndex: number } | null => {
  if (!label) {
    return null;
  }
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) {
    return null;
  }
  const year = Number(parts[parts.length - 1]);
  const monthName = normalizeLabel(parts.slice(0, parts.length - 1).join(' '));
  const monthIndex = MONTH_MAP[monthName];
  if (Number.isNaN(year) || monthIndex === undefined) {
    return null;
  }
  return { year, monthIndex };
};

const buildMonthKey = (year: number, monthIndex: number): string => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

const parseMonthKey = (
  key: string,
): { year: number; monthIndex: number } | null => {
  const [yearPart, monthPart] = key.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
    return null;
  }
  return { year, monthIndex };
};

const formatCurrencyValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  if (Math.abs(value) < 0.005) {
    return '-';
  }
  return currencyFormatter.format(value);
};

const parseNumberInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(/,/g, '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};
const calcRatios = (values: number[]): number[] => {
  const total = values.reduce((acc, value) => acc + value, 0);
  if (values.length === 0) {
    return [];
  }
  if (total === 0) {
    return values.map(() => 1 / values.length);
  }
  return values.map((value) => value / total);
};

interface PlanMonthEntry {
  monthIndex: number;
  consuntivo: number;
  preventivo: number;
}

interface PlanDetailRow {
  macro: string;
  category: string;
  detail: string;
  months: PlanMonthEntry[];
}

interface PlanMacroBlock {
  macro: string;
  details: PlanDetailRow[];
}

interface PlanYearData {
  year: number;
  macros: PlanMacroBlock[];
  totals: Record<string, { consuntivo: number[]; preventivo: number[] }>;
}

interface BusinessPlanYearMetrics {
  fatturatoTotale: number;
  monthlyFatturato: number[];
  incassato: number;
  monthlyIncassato: number[];
  costiFissi: number;
  monthlyCostiFissi: number[];
  costiVariabili: number;
  monthlyCostiVariabili: number[];
}

interface BusinessPlanDraft {
  baseYear: number;
  targetYear: number;
  fatturatoIncrement: number;
  fatturatoPrevisionale: number;
  incassatoPercent: number;
  incassatoPrevisionale: number;
  costiFissiPercent: number;
  costiFissiPrevisionale: number;
  costiVariabiliPercent: number;
  costiVariabiliPrevisionale: number;
}

type BusinessPlanDrafts = Record<string, BusinessPlanDraft>;

interface BusinessPlanFormState {
  baseYear: number | null;
  targetYear: number;
  fatturatoIncrement: string;
  fatturatoPrevisionale: string;
  incassatoPercent: string;
  incassatoPrevisionale: string;
  costiFissiPercent: string;
  costiFissiPrevisionale: string;
  costiVariabiliPercent: string;
  costiVariabiliPrevisionale: string;
  utilePrevisionale: string;
  utilePercent: string;
}

interface BusinessPlanMessage {
  type: 'success' | 'info' | 'error';
  text: string;
}

const buildDetailMeta = () => {
  const map = new Map<string, { macro: string; category: string }>();
  financialCausali.forEach((group: FinancialCausaleGroup) => {
    group.categories.forEach((category) => {
      category.items.forEach((item) => {
        map.set(normalizeLabel(item), {
          macro: group.macroCategory,
          category: category.name,
        });
      });
    });
  });
  return map;
};

const computePlanData = (
  detailMeta: Map<string, { macro: string; category: string }>,
): Map<number, PlanYearData> => {
  const yearMap = new Map<number, Map<string, Map<string, PlanDetailRow>>>();

  financialPlanRows.forEach((row) => {
    const meta = detailMeta.get(normalizeLabel(row.detail)) ?? {
      macro: row.macroCategory,
      category: 'Altro',
    };

    row.months.forEach((monthValue) => {
      const parsed = parsePlanMonthLabel(monthValue.month);
      if (!parsed) {
        return;
      }
      const { year, monthIndex } = parsed;

      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }
      const macroMap = yearMap.get(year)!;

      if (!macroMap.has(meta.macro)) {
        macroMap.set(meta.macro, new Map());
      }
        const detailKey = `${meta.category}__${row.detail}`;
      const detailMap = macroMap.get(meta.macro)!;

      if (!detailMap.has(detailKey)) {
        detailMap.set(detailKey, {
          macro: meta.macro,
          category: meta.category,
          detail: row.detail,
          months: new Array<PlanMonthEntry>(12).fill(null).map((_, idx) => ({
            monthIndex: idx,
            consuntivo: 0,
            preventivo: 0,
          })),
        });
      }
      const detailEntry = detailMap.get(detailKey)!;
      detailEntry.months[monthIndex] = {
        monthIndex,
        consuntivo: monthValue.consuntivo ?? 0,
        preventivo: monthValue.preventivo ?? monthValue.consuntivo ?? 0,
      };
    });
  });

  const planByYear = new Map<number, PlanYearData>();
  yearMap.forEach((macroMap, year) => {
    const macros: PlanMacroBlock[] = [];
    const totals: PlanYearData['totals'] = {};

    macroMap.forEach((detailMap, macroName) => {
      const details = Array.from(detailMap.values());
      macros.push({ macro: macroName, details });

      totals[macroName] = {
        consuntivo: new Array(12).fill(0),
        preventivo: new Array(12).fill(0),
      };

      details.forEach((detail) => {
        detail.months.forEach((month) => {
          totals[macroName].consuntivo[month.monthIndex] += month.consuntivo;
          totals[macroName].preventivo[month.monthIndex] += month.preventivo;
        });
      });
    });

    planByYear.set(year, { year, macros, totals });
  });

  return planByYear;
};
const computeYearMetrics = (
  planByYear: Map<number, PlanYearData>,
): Map<number, BusinessPlanYearMetrics> => {
  const metrics = new Map<number, BusinessPlanYearMetrics>();

  planByYear.forEach((planYear, year) => {
    const incassato = planYear.totals['INCASSATO']?.consuntivo ?? new Array(12).fill(0);
    const costiFissi = planYear.totals['COSTI FISSI']?.consuntivo ?? new Array(12).fill(0);
    const costiVariabili = planYear.totals['COSTI VARIABILI']?.consuntivo ?? new Array(12).fill(0);

    metrics.set(year, {
      fatturatoTotale: 0,
      monthlyFatturato: new Array(12).fill(0),
      incassato: incassato.reduce((acc, value) => acc + value, 0),
      monthlyIncassato: [...incassato],
      costiFissi: costiFissi.reduce((acc, value) => acc + value, 0),
      monthlyCostiFissi: [...costiFissi],
      costiVariabili: costiVariabili.reduce((acc, value) => acc + value, 0),
      monthlyCostiVariabili: [...costiVariabili],
    });
  });

  financialStatsRows.forEach((row) => {
    const parsed = parsePlanMonthLabel(row.month);
    if (!parsed) {
      return;
    }
    const { year, monthIndex } = parsed;
    if (!metrics.has(year)) {
      metrics.set(year, {
        fatturatoTotale: 0,
        monthlyFatturato: new Array(12).fill(0),
        incassato: 0,
        monthlyIncassato: new Array(12).fill(0),
        costiFissi: 0,
        monthlyCostiFissi: new Array(12).fill(0),
        costiVariabili: 0,
        monthlyCostiVariabili: new Array(12).fill(0),
      });
    }
    const entry = metrics.get(year)!;
    entry.fatturatoTotale += row.fatturatoTotale ?? 0;
    entry.monthlyFatturato[monthIndex] += row.fatturatoTotale ?? 0;
  });

  return metrics;
};

const createBusinessPlanFormFromMetrics = (
  metrics: BusinessPlanYearMetrics | undefined,
  baseYear: number,
  targetYear: number,
): BusinessPlanFormState => {
  if (!metrics) {
    return {
      baseYear,
      targetYear,
      fatturatoIncrement: '0',
      fatturatoPrevisionale: '0.00',
      incassatoPercent: '0.00',
      incassatoPrevisionale: '0.00',
      costiFissiPercent: '0.00',
      costiFissiPrevisionale: '0.00',
      costiVariabiliPercent: '0.00',
      costiVariabiliPrevisionale: '0.00',
      utilePrevisionale: '0.00',
      utilePercent: '0.00',
    };
  }

  const fatturato = metrics.fatturatoTotale;
  const incassato = metrics.incassato;
  const costiFissi = metrics.costiFissi;
  const costiVariabili = metrics.costiVariabili;
  const utile = incassato - costiFissi - costiVariabili;

  return {
    baseYear,
    targetYear,
    fatturatoIncrement: '0',
    fatturatoPrevisionale: round2(fatturato).toFixed(2),
    incassatoPercent:
      fatturato === 0 ? '0.00' : round2((incassato / fatturato) * 100).toFixed(2),
    incassatoPrevisionale: round2(incassato).toFixed(2),
    costiFissiPercent:
      incassato === 0 ? '0.00' : round2((costiFissi / incassato) * 100).toFixed(2),
    costiFissiPrevisionale: round2(costiFissi).toFixed(2),
    costiVariabiliPercent:
      incassato === 0 ? '0.00' : round2((costiVariabili / incassato) * 100).toFixed(2),
    costiVariabiliPrevisionale: round2(costiVariabili).toFixed(2),
    utilePrevisionale: round2(utile).toFixed(2),
    utilePercent:
      incassato === 0 ? '0.00' : round2((utile / incassato) * 100).toFixed(2),
  };
};

const createBusinessPlanFormFromDraft = (
  draft: BusinessPlanDraft,
): BusinessPlanFormState => {
  const utile =
    draft.incassatoPrevisionale -
    draft.costiFissiPrevisionale -
    draft.costiVariabiliPrevisionale;

  return {
    baseYear: draft.baseYear,
    targetYear: draft.targetYear,
    fatturatoIncrement: draft.fatturatoIncrement.toFixed(2),
    fatturatoPrevisionale: draft.fatturatoPrevisionale.toFixed(2),
    incassatoPercent: draft.incassatoPercent.toFixed(2),
    incassatoPrevisionale: draft.incassatoPrevisionale.toFixed(2),
    costiFissiPercent: draft.costiFissiPercent.toFixed(2),
    costiFissiPrevisionale: draft.costiFissiPrevisionale.toFixed(2),
    costiVariabiliPercent: draft.costiVariabiliPercent.toFixed(2),
    costiVariabiliPrevisionale: draft.costiVariabiliPrevisionale.toFixed(2),
    utilePrevisionale: round2(utile).toFixed(2),
    utilePercent:
      draft.incassatoPrevisionale === 0
        ? '0.00'
        : round2((utile / draft.incassatoPrevisionale) * 100).toFixed(2),
  };
};

const FinancialPlan: React.FC = () => {
  const detailMeta = useMemo(() => buildDetailMeta(), []);
  const basePlanByYear = useMemo(() => computePlanData(detailMeta), [detailMeta]);
  const yearMetrics = useMemo(
    () => computeYearMetrics(basePlanByYear),
    [basePlanByYear],
  );
  const [planOverrides, setPlanOverrides] = useState<PlanOverrides>({});
  const [statsOverrides, setStatsOverrides] = useState<StatsOverrides>({});
  const [businessPlanDrafts, setBusinessPlanDrafts] = useState<BusinessPlanDrafts>({});
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [businessPlanForm, setBusinessPlanForm] = useState<BusinessPlanFormState | null>(null);
  const [businessPlanMessage, setBusinessPlanMessage] = useState<BusinessPlanMessage | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const storedPlan = window.localStorage.getItem('financialPlan.preventivoOverrides');
      const storedStats = window.localStorage.getItem('financialPlan.statsForecastOverrides');
      const storedBusiness = window.localStorage.getItem('financialPlan.businessPlanDrafts');
      if (storedPlan) {
        setPlanOverrides(JSON.parse(storedPlan));
      }
      if (storedStats) {
        setStatsOverrides(JSON.parse(storedStats));
      }
      if (storedBusiness) {
        setBusinessPlanDrafts(JSON.parse(storedBusiness));
      }
    } catch (error) {
      console.error('Impossibile leggere i dati salvati', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('financialPlan.preventivoOverrides', JSON.stringify(planOverrides));
  }, [planOverrides]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('financialPlan.statsForecastOverrides', JSON.stringify(statsOverrides));
  }, [statsOverrides]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('financialPlan.businessPlanDrafts', JSON.stringify(businessPlanDrafts));
  }, [businessPlanDrafts]);

  const availableYears = useMemo(
    () => Array.from(basePlanByYear.keys()).sort((a, b) => a - b),
    [basePlanByYear],
  );

  const latestYear =
    availableYears.length > 0
      ? availableYears[availableYears.length - 1]
      : new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(latestYear);

  useEffect(() => {
    if (!basePlanByYear.has(selectedYear)) {
      setSelectedYear(latestYear);
    }
  }, [basePlanByYear, selectedYear, latestYear]);

  const completeYears = useMemo(() => {
    const years: number[] = [];
    yearMetrics.forEach((metrics, year) => {
      const hasMonths =
        metrics.monthlyIncassato.length === 12 &&
        metrics.monthlyCostiFissi.length === 12 &&
        metrics.monthlyCostiVariabili.length === 12;
      if (hasMonths) {
        years.push(year);
      }
    });
    return years.sort((a, b) => a - b);
  }, [yearMetrics]);
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

  const recalcBusinessPlan = useCallback(
    (
      draft: BusinessPlanFormState,
      changedField?:
        | 'fatturatoIncrement'
        | 'incassatoPercent'
        | 'incassatoValue'
        | 'costiFissiPercent'
        | 'costiFissiValue'
        | 'costiVariabiliPercent'
        | 'costiVariabiliValue',
    ): BusinessPlanFormState => {
      if (draft.baseYear === null) {
        return draft;
      }
      const metrics = yearMetrics.get(draft.baseYear);
      if (!metrics) {
        return draft;
      }

      const fatturatoBase = metrics.fatturatoTotale;
      const incassatoBase = metrics.incassato;
      const costiFissiBase = metrics.costiFissi;
      const costiVariabiliBase = metrics.costiVariabili;

      const fatturatoIncrement = parseNumberInput(draft.fatturatoIncrement) ?? 0;
      const fatturatoPrevisionale = round2(
        fatturatoBase * (1 + fatturatoIncrement / 100),
      );

      let incPercent = parseNumberInput(draft.incassatoPercent);
      let incValue = parseNumberInput(draft.incassatoPrevisionale);

      if (changedField === 'incassatoPercent') {
        incPercent = incPercent ?? 0;
        incValue = round2((incPercent / 100) * fatturatoPrevisionale);
      } else if (changedField === 'incassatoValue') {
        incValue = incValue ?? 0;
        incPercent =
          fatturatoPrevisionale === 0
            ? 0
            : round2((incValue / fatturatoPrevisionale) * 100);
      } else {
        if (incPercent === null && incValue === null) {
          incPercent =
            fatturatoBase === 0
              ? 0
              : round2((incassatoBase / fatturatoBase) * 100);
          incValue = round2((incPercent / 100) * fatturatoPrevisionale);
        } else if (incPercent === null) {
          incValue = incValue ?? 0;
          incPercent =
            fatturatoPrevisionale === 0
              ? 0
              : round2((incValue / fatturatoPrevisionale) * 100);
        } else if (incValue === null) {
          incPercent = incPercent ?? 0;
          incValue = round2((incPercent / 100) * fatturatoPrevisionale);
        }
      }

      const computeCost = (
        percentValue: string,
        amountValue: string,
        basePercent: number,
        totalIncassato: number,
        percentField: 'costiFissiPercent' | 'costiVariabiliPercent',
        valueField: 'costiFissiValue' | 'costiVariabiliValue',
      ) => {
        let percent = parseNumberInput(percentValue);
        let amount = parseNumberInput(amountValue);

        if (changedField === percentField) {
          percent = percent ?? 0;
          amount = round2((percent / 100) * totalIncassato);
        } else if (changedField === valueField) {
          amount = amount ?? 0;
          percent = totalIncassato === 0 ? 0 : round2((amount / totalIncassato) * 100);
        } else {
          if (percent === null && amount === null) {
            percent = basePercent;
            amount = round2((percent / 100) * totalIncassato);
          } else if (percent === null) {
            amount = amount ?? 0;
            percent = totalIncassato === 0 ? 0 : round2((amount / totalIncassato) * 100);
          } else if (amount === null) {
            percent = percent ?? 0;
            amount = round2((percent / 100) * totalIncassato);
          }
        }

        return {
          percent: percent ?? 0,
          amount: round2(amount ?? 0),
        };
      };

      const incassatoFinal = round2(incValue ?? 0);
      const costiFissiCalc = computeCost(
        draft.costiFissiPercent,
        draft.costiFissiPrevisionale,
        incassatoBase === 0 ? 0 : round2((costiFissiBase / incassatoBase) * 100),
        incassatoFinal,
        'costiFissiPercent',
        'costiFissiValue',
      );

      const costiVariabiliCalc = computeCost(
        draft.costiVariabiliPercent,
        draft.costiVariabiliPrevisionale,
        incassatoBase === 0
          ? 0
          : round2((costiVariabiliBase / incassatoBase) * 100),
        incassatoFinal,
        'costiVariabiliPercent',
        'costiVariabiliValue',
      );

      const utile = round2(
        incassatoFinal - costiFissiCalc.amount - costiVariabiliCalc.amount,
      );
      const utilePercent =
        incassatoFinal === 0 ? 0 : round2((utile / incassatoFinal) * 100);

      return {
        ...draft,
        fatturatoPrevisionale: fatturatoPrevisionale.toFixed(2),
        incassatoPercent: (incPercent ?? 0).toFixed(2),
        incassatoPrevisionale: incassatoFinal.toFixed(2),
        costiFissiPercent: costiFissiCalc.percent.toFixed(2),
        costiFissiPrevisionale: costiFissiCalc.amount.toFixed(2),
        costiVariabiliPercent: costiVariabiliCalc.percent.toFixed(2),
        costiVariabiliPrevisionale: costiVariabiliCalc.amount.toFixed(2),
        utilePrevisionale: utile.toFixed(2),
        utilePercent: utilePercent.toFixed(2),
      };
    },
    [yearMetrics],
  );
  useEffect(() => {
    if (businessPlanForm) {
      return;
    }
    const defaultBaseYear =
      completeYears.length > 0
        ? completeYears[completeYears.length - 1]
        : latestYear;
    const defaultTarget = defaultBaseYear + 1;
    const stored = businessPlanDrafts[String(defaultTarget)];
    const form = stored
      ? createBusinessPlanFormFromDraft(stored)
      : createBusinessPlanFormFromMetrics(
          yearMetrics.get(defaultBaseYear),
          defaultBaseYear,
          defaultTarget,
        );
    setBusinessPlanForm(recalcBusinessPlan(form));
  }, [
    businessPlanForm,
    businessPlanDrafts,
    completeYears,
    latestYear,
    recalcBusinessPlan,
    yearMetrics,
  ]);

  const planYear = basePlanByYear.get(selectedYear);

  const overviewTotals = useMemo(() => {
    if (!planYear) {
      return {
        incassato: 0,
        costiFissi: 0,
        costiVariabili: 0,
        utile: 0,
      };
    }
    const incassato =
      planYear.totals['INCASSATO']?.consuntivo.reduce((acc, value) => acc + value, 0) ??
      0;
    const costiFissi =
      planYear.totals['COSTI FISSI']?.consuntivo.reduce((acc, value) => acc + value, 0) ??
      0;
    const costiVariabili =
      planYear.totals['COSTI VARIABILI']?.consuntivo.reduce((acc, value) => acc + value, 0) ??
      0;
    return {
      incassato,
      costiFissi,
      costiVariabili,
      utile: incassato - costiFissi - costiVariabili,
    };
  }, [planYear]);

  const overviewChartData = useMemo(() => {
    if (!planYear) {
      return [];
    }
    const incassato = planYear.totals['INCASSATO']?.consuntivo ?? new Array(12).fill(0);
    const costiFissi = planYear.totals['COSTI FISSI']?.consuntivo ?? new Array(12).fill(0);
    const costiVariabili =
      planYear.totals['COSTI VARIABILI']?.consuntivo ?? new Array(12).fill(0);

    return MONTH_SHORT.map((label, index) => ({
      month: `${label} ${String(selectedYear).slice(-2)}` ,
      incassato: incassato[index] ?? 0,
      costiFissi: costiFissi[index] ?? 0,
      costiVariabili: costiVariabili[index] ?? 0,
      utile:
        (incassato[index] ?? 0) -
        (costiFissi[index] ?? 0) -
        (costiVariabili[index] ?? 0),
    }));
  }, [planYear, selectedYear]);

  const statsTableData = useMemo(() => {
    const rows: Array<{
      monthKey: string;
      year: number;
      monthIndex: number;
      fatturatoTotale: number | null;
      fatturatoPrevisionale: number | null;
      incassato: number | null;
      incassatoPrevisionale: number | null;
      utile: number | null;
      utilePrevisionale: number | null;
    }> = [];

    const statsMap = new Map<
      string,
      FinancialStatsRow & { year: number; monthIndex: number }
    >();

    financialStatsRows.forEach((row) => {
      const parsed = parsePlanMonthLabel(row.month);
      if (!parsed) {
        return;
      }
      const { year, monthIndex } = parsed;
      const monthKey = buildMonthKey(year, monthIndex);
      statsMap.set(monthKey, {
        ...row,
        year,
        monthIndex,
      });
    });

    Object.entries(statsOverrides).forEach(([monthKey, override]) => {
      const parsed = parseMonthKey(monthKey);
      if (!parsed) {
        return;
      }
      const { year, monthIndex } = parsed;
      const base = statsMap.get(monthKey);
      statsMap.set(monthKey, {
        month: base?.month ?? format(new Date(year, monthIndex, 1), 'MMMM yyyy', { locale: it }),
        fatturatoImponibile: base?.fatturatoImponibile ?? null,
        fatturatoTotale: base?.fatturatoTotale ?? null,
        utileCassa: base?.utileCassa ?? null,
        incassato: base?.incassato ?? null,
        saldoConto: base?.saldoConto ?? null,
        saldoSecondoConto: base?.saldoSecondoConto ?? null,
        saldoTotale: base?.saldoTotale ?? null,
        creditiPendenti: base?.creditiPendenti ?? null,
        creditiScaduti: base?.creditiScaduti ?? null,
        debitiFornitore: base?.debitiFornitore ?? null,
        debitiBancari: base?.debitiBancari ?? null,
        fatturatoPrevisionale:
          override.fatturatoPrevisionale ?? base?.fatturatoPrevisionale ?? null,
        incassatoPrevisionale:
          override.incassatoPrevisionale ?? base?.incassatoPrevisionale ?? null,
        utilePrevisionale:
          override.utilePrevisionale ?? base?.utilePrevisionale ?? null,
        year,
        monthIndex,
      } as FinancialStatsRow & { year: number; monthIndex: number });
    });

    availableYears.forEach((year) => {
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const monthKey = buildMonthKey(year, monthIndex);
        const data = statsMap.get(monthKey);
        rows.push({
          monthKey,
          year,
          monthIndex,
          fatturatoTotale: data?.fatturatoTotale ?? null,
          fatturatoPrevisionale: data?.fatturatoPrevisionale ?? null,
          incassato: data?.incassato ?? null,
          incassatoPrevisionale: data?.incassatoPrevisionale ?? null,
          utile: data?.utileCassa ?? null,
          utilePrevisionale: data?.utilePrevisionale ?? null,
        });
      }
    });

    return rows;
  }, [availableYears, statsOverrides]);
  const handleBusinessPlanFieldChange = (
    field:
      | 'fatturatoIncrement'
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
      return recalcBusinessPlan(next, field);
    });
  };

  const handleBusinessPlanBaseYearChange = (year: number) => {
    const metrics = yearMetrics.get(year);
    const stored = businessPlanDrafts[String(year + 1)];
    const form = stored
      ? createBusinessPlanFormFromDraft(stored)
      : createBusinessPlanFormFromMetrics(metrics, year, year + 1);
    setBusinessPlanForm(recalcBusinessPlan(form));
  };

  const handleBusinessPlanTargetYearChange = (value: string) => {
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
        return recalcBusinessPlan(createBusinessPlanFormFromDraft(stored));
      }
      return recalcBusinessPlan({
        ...prev,
        targetYear,
      });
    });
  };

  const handleSaveBusinessPlanDraft = () => {
    if (!businessPlanForm || businessPlanForm.baseYear === null) {
      setBusinessPlanMessage({
        type: 'error',
        text: 'Seleziona un anno base valido prima di salvare.',
      });
      return;
    }
    const normalized = recalcBusinessPlan(businessPlanForm);
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
    };
    setBusinessPlanDrafts((prev) => ({
      ...prev,
      [String(draft.targetYear)]: draft,
    }));
    setBusinessPlanForm(normalized);
    setBusinessPlanMessage({
      type: 'success',
      text: `Previsionale ${targetYear} applicato e salvato.`,
    });
  };

  const filterPlanOverridesForYear = (
    overrides: PlanOverrides,
    year: number,
  ): PlanOverrides => {
    const result: PlanOverrides = {};
    Object.entries(overrides).forEach(([macro, categories]) => {
      Object.entries(categories).forEach(([category, details]) => {
        Object.entries(details).forEach(([detail, months]) => {
          Object.entries(months).forEach(([monthKey, value]) => {
            const parsed = parseMonthKey(monthKey);
            if (!parsed || parsed.year === year) {
              return;
            }
            if (!result[macro]) {
              result[macro] = {};
            }
            if (!result[macro][category]) {
              result[macro][category] = {};
            }
            if (!result[macro][category][detail]) {
              result[macro][category][detail] = {};
            }
            result[macro][category][detail][monthKey] = value;
          });
        });
      });
    });
    return result;
  };

  const filterStatsOverridesForYear = (
    overrides: StatsOverrides,
    year: number,
  ): StatsOverrides => {
    const result: StatsOverrides = {};
    Object.entries(overrides).forEach(([monthKey, override]) => {
      const parsed = parseMonthKey(monthKey);
      if (!parsed || parsed.year === year) {
        return;
      }
      result[monthKey] = override;
    });
    return result;
  };
  const applyBusinessPlanToOverrides = () => {
    if (!businessPlanForm || businessPlanForm.baseYear === null) {
      setBusinessPlanMessage({
        type: 'error',
        text: 'Compila il Business Plan prima di applicare il previsionale.',
      });
      return;
    }
    const planBase = basePlanByYear.get(businessPlanForm.baseYear);
    const metrics = yearMetrics.get(businessPlanForm.baseYear);
    if (!planBase || !metrics) {
      setBusinessPlanMessage({
        type: 'error',
        text: 'Dati storici insufficienti per l\'anno base selezionato.',
      });
      return;
    }

    const normalized = recalcBusinessPlan(businessPlanForm);
    const targetYear = normalized.targetYear;

    const fatturatoPrevisionale =
      parseNumberInput(normalized.fatturatoPrevisionale) ?? metrics.fatturatoTotale;
    const incassatoPrevisionale =
      parseNumberInput(normalized.incassatoPrevisionale) ?? metrics.incassato;
    const costiFissiPrevisionale =
      parseNumberInput(normalized.costiFissiPrevisionale) ?? metrics.costiFissi;
    const costiVariabiliPrevisionale =
      parseNumberInput(normalized.costiVariabiliPrevisionale) ?? metrics.costiVariabili;

    let nextPlanOverrides = filterPlanOverridesForYear(planOverrides, targetYear);

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
      const macroKey = normalizeLabel(macro.macro);
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
          const monthKey = buildMonthKey(targetYear, monthIndex);
          nextPlanOverrides[detail.macro][detail.category][detail.detail][monthKey] = monthValue;
        });
      });
    });

    const fatturatoRatios = calcRatios(metrics.monthlyFatturato);
    const incassatoRatios = calcRatios(metrics.monthlyIncassato);
    const costiFissiRatios = calcRatios(metrics.monthlyCostiFissi);
    const costiVariabiliRatios = calcRatios(metrics.monthlyCostiVariabili);

    let nextStatsOverrides = filterStatsOverridesForYear(statsOverrides, targetYear);

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const monthKey = buildMonthKey(targetYear, monthIndex);
      const fatturatoMonthly = round2(
        fatturatoPrevisionale * (fatturatoRatios[monthIndex] ?? 1 / 12),
      );
      const incassatoMonthly = round2(
        incassatoPrevisionale * (incassatoRatios[monthIndex] ?? 1 / 12),
      );
      const costiFissiMonthly = round2(
        costiFissiPrevisionale * (costiFissiRatios[monthIndex] ?? 1 / 12),
      );
      const costiVariabiliMonthly = round2(
        costiVariabiliPrevisionale * (costiVariabiliRatios[monthIndex] ?? 1 / 12),
      );
      const utileMonthly = round2(
        incassatoMonthly - costiFissiMonthly - costiVariabiliMonthly,
      );

      nextStatsOverrides[monthKey] = {
        ...(nextStatsOverrides[monthKey] ?? {}),
        fatturatoPrevisionale: fatturatoMonthly,
        incassatoPrevisionale: incassatoMonthly,
        utilePrevisionale: utileMonthly,
      };
    }

    const draft: BusinessPlanDraft = {
      baseYear: normalized.baseYear!,
      targetYear: normalized.targetYear,
      fatturatoIncrement: parseNumberInput(normalized.fatturatoIncrement) ?? 0,
      fatturatoPrevisionale,
      incassatoPercent: parseNumberInput(normalized.incassatoPercent) ?? 0,
      incassatoPrevisionale,
      costiFissiPercent: parseNumberInput(normalized.costiFissiPercent) ?? 0,
      costiFissiPrevisionale,
      costiVariabiliPercent: parseNumberInput(normalized.costiVariabiliPercent) ?? 0,
      costiVariabiliPrevisionale,
    };

    setPlanOverrides(nextPlanOverrides);
    setStatsOverrides(nextStatsOverrides);
    setBusinessPlanDrafts((prev) => ({
      ...prev,
      [String(draft.targetYear)]: draft,
    }));
    setBusinessPlanForm(normalized);
    setBusinessPlanMessage({
      type: 'success',
      text: `Previsionale ${targetYear} applicato e salvato.`,
    });
  };

  const handleResetBusinessPlan = () => {
    if (!businessPlanForm) {
      return;
    }
    const targetYear = businessPlanForm.targetYear;
    setPlanOverrides(filterPlanOverridesForYear(planOverrides, targetYear));
    setStatsOverrides(filterStatsOverridesForYear(statsOverrides, targetYear));
    setBusinessPlanMessage({
      type: 'info',
      text: `Previsionale ${targetYear} ripristinato.`,
    });
  };
  const renderOverview = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Incassato {selectedYear}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatCurrencyValue(overviewTotals.incassato)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Costi fissi {selectedYear}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatCurrencyValue(overviewTotals.costiFissi)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Costi variabili {selectedYear}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatCurrencyValue(overviewTotals.costiVariabili)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Utile {selectedYear}
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">
            {formatCurrencyValue(overviewTotals.utile)}
          </p>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={overviewChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
            <Line type="monotone" dataKey="incassato" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="costiFissi" stroke="#f97316" strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="costiVariabili"
              stroke="#facc15"
              strokeWidth={2}
            />
            <Line type="monotone" dataKey="utile" stroke="#047857" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderPlan = () => (
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
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white p-5 shadow-sm">
        {!planYear ? (
          <p className="text-sm text-gray-500">
            Nessun dato disponibile per la selezione corrente.
          </p>
        ) : (
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-3 text-left">Macro</th>
                <th className="px-3 py-3 text-left">Categoria</th>
                <th className="px-3 py-3 text-left">Voce</th>
                {MONTH_NAMES.map((name, index) => (
                  <th key={name} className="px-3 py-3 text-right">
                    {MONTH_SHORT[index]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {planYear.macros.map((macro) => (
                <React.Fragment key={macro.macro}>
                  <tr className="bg-slate-100 text-xs uppercase text-gray-600">
                    <td className="px-3 py-2" colSpan={3 + MONTH_NAMES.length}>
                      {macro.macro}
                    </td>
                  </tr>
                  {macro.details.map((detail) => (
                    <tr key={`${detail.category}-${detail.detail}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm text-gray-600">{macro.macro}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{detail.category}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{detail.detail}</td>
                      {detail.months.map((month) => (
                        <td
                          key={month.monthIndex}
                          className="px-3 py-2 text-right text-sm text-gray-700"
                        >
                          <div>{formatCurrencyValue(month.consuntivo)}</div>
                          <div className="text-xs text-gray-400">
                            {formatCurrencyValue(
                              getPlanPreventivoValue(
                                macro.macro,
                                detail.category,
                                detail.detail,
                                selectedYear,
                                month.monthIndex,
                              ),
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
  const renderBusinessPlan = () => {
    if (!businessPlanForm) {
      return (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Inserisci almeno un anno completo per utilizzare il Business Plan.
          </p>
        </div>
      );
    }

    const baseYearOptions =
      completeYears.length > 0 ? completeYears : availableYears;

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
                onChange={(event) => handleBusinessPlanBaseYearChange(Number(event.target.value))}
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
                onChange={(event) => handleBusinessPlanTargetYearChange(event.target.value)}
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
                onChange={(event) => handleBusinessPlanFieldChange('fatturatoIncrement', event.target.value)}
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
                readOnly
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm"
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
                  onChange={(event) => handleBusinessPlanFieldChange('incassatoPercent', event.target.value)}
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
                  onChange={(event) => handleBusinessPlanFieldChange('incassatoValue', event.target.value)}
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
                  onChange={(event) => handleBusinessPlanFieldChange('costiFissiPercent', event.target.value)}
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
                  onChange={(event) => handleBusinessPlanFieldChange('costiFissiValue', event.target.value)}
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
                  onChange={(event) => handleBusinessPlanFieldChange('costiVariabiliPercent', event.target.value)}
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
                  onChange={(event) => handleBusinessPlanFieldChange('costiVariabiliValue', event.target.value)}
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

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSaveBusinessPlanDraft}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-600"
          >
            Salva previsionale
          </button>
          <button
            type="button"
            onClick={applyBusinessPlanToOverrides}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Salva e inserisci previsionale
          </button>
          <button
            type="button"
            onClick={handleResetBusinessPlan}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-slate-300"
          >
            Reset previsionale
          </button>
        </div>
      </div>
    );
  };

  const renderStats = () => (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-3 text-left">Periodo</th>
                <th className="px-3 py-3 text-right">Fatturato</th>
                <th className="px-3 py-3 text-right">Fatturato previsionale</th>
                <th className="px-3 py-3 text-right">Incassato</th>
                <th className="px-3 py-3 text-right">Incassato previsionale</th>
                <th className="px-3 py-3 text-right">Utile</th>
                <th className="px-3 py-3 text-right">Utile previsionale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statsTableData.map((row) => (
                <tr key={row.monthKey} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {format(new Date(row.year, row.monthIndex, 1), 'MMMM yyyy', { locale: it })}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-700">
                    {formatCurrencyValue(row.fatturatoTotale)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-sky-700">
                    {formatCurrencyValue(row.fatturatoPrevisionale)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-700">
                    {formatCurrencyValue(row.incassato)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-sky-700">
                    {formatCurrencyValue(row.incassatoPrevisionale)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-emerald-700">
                    {formatCurrencyValue(row.utile)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-emerald-700">
                    {formatCurrencyValue(row.utilePrevisionale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'overview', label: 'Panoramica' },
          { key: 'plan', label: 'Piano Mensile' },
          { key: 'business-plan', label: 'Business Plan' },
          { key: 'stats', label: 'Statistiche' },
        ].map((tab) => (
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

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'plan' && renderPlan()}
      {activeTab === 'business-plan' && renderBusinessPlan()}
      {activeTab === 'stats' && renderStats()}
    </div>
  );
};

export default FinancialPlan;



