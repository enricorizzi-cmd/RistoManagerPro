// Financial Calculations
// Complex business logic extracted from FinancialPlan component

import type { FinancialCausaleGroup, FinancialStatsRow } from '../data/financialPlanData';
import { 
  parsePlanMonthLabel, 
  buildMonthKey, 
  round2, 
  normalizeLabel 
} from './financialPlanUtils';

export interface PlanMonthEntry {
  monthIndex: number;
  consuntivo: number;
  preventivo: number;
}

export interface PlanDetailRow {
  macro: string;
  category: string;
  detail: string;
  months: PlanMonthEntry[];
}

export interface PlanMacroBlock {
  macro: string;
  details: PlanDetailRow[];
}

export interface PlanYearData {
  year: number;
  macros: PlanMacroBlock[];
  totals: Record<string, { consuntivo: number[]; preventivo: number[] }>;
}

export interface BusinessPlanYearMetrics {
  fatturatoTotale: number;
  monthlyFatturato: number[];
  incassato: number;
  monthlyIncassato: number[];
  costiFissi: number;
  monthlyCostiFissi: number[];
  costiVariabili: number;
  monthlyCostiVariabili: number[];
}

export const buildDetailMeta = (causaliCatalog: FinancialCausaleGroup[]) => {
  const map = new Map<string, { macro: string; category: string }>();
  causaliCatalog.forEach((group: FinancialCausaleGroup) => {
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

export const computePlanData = (
  causaliCatalog: FinancialCausaleGroup[],
): Map<number, PlanYearData> => {
  const yearMap = new Map<number, Map<string, Map<string, PlanDetailRow>>>();

  // Use causaliCatalog as the source of truth instead of financialPlanRows
  causaliCatalog.forEach((group) => {
    group.categories.forEach((category) => {
      category.items.forEach((item) => {
        // Create entries for current year and next year
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear + 1];
        
        years.forEach((year) => {
          if (!yearMap.has(year)) {
            yearMap.set(year, new Map());
          }
          const macroMap = yearMap.get(year)!;

          if (!macroMap.has(group.macroCategory)) {
            macroMap.set(group.macroCategory, new Map());
          }
          
          const detailKey = `${category.name}__${item}`;
          const detailMap = macroMap.get(group.macroCategory)!;

          if (!detailMap.has(detailKey)) {
            detailMap.set(detailKey, {
              macro: group.macroCategory,
              category: category.name,
              detail: item,
              months: new Array<PlanMonthEntry>(12).fill(null).map((_, idx) => ({
                monthIndex: idx,
                consuntivo: 0,
                preventivo: 0,
              })),
            });
          }
        });
      });
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

export const computeYearMetrics = (
  planByYear: Map<number, PlanYearData>,
  financialStatsRows: FinancialStatsRow[],
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
