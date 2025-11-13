// Financial Calculations
// Complex business logic extracted from FinancialPlan component

import type {
  FinancialCausaleGroup,
  FinancialStatsRow,
} from '../data/financialPlanData';
import {
  parsePlanMonthLabel,
  buildMonthKey,
  normalizeLabel,
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
    group.categories.forEach(category => {
      category.items.forEach(item => {
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
  availableYears?: number[]
): Map<number, PlanYearData> => {
  const yearMap = new Map<number, Map<string, Map<string, PlanDetailRow>>>();

  // Use causaliCatalog as the source of truth instead of financialPlanRows
  causaliCatalog.forEach(group => {
    group.categories.forEach(category => {
      category.items.forEach(item => {
        // Create entries for available years or default range
        const currentYear = new Date().getFullYear();
        const years =
          availableYears && availableYears.length > 0
            ? availableYears
            : Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

        years.forEach(year => {
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
              months: new Array<PlanMonthEntry>(12)
                .fill(null)
                .map((_, idx) => ({
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

      details.forEach(detail => {
        detail.months.forEach(month => {
          totals[macroName].consuntivo[month.monthIndex] += month.consuntivo;
          totals[macroName].preventivo[month.monthIndex] += month.preventivo;
        });
      });
    });

    planByYear.set(year, { year, macros, totals });
  });

  return planByYear;
};

// Get macro total by macroId (following golden rule #1)
export const getMacroTotal = (
  macroId: number,
  causaliCatalog: FinancialCausaleGroup[],
  planYear: PlanYearData | undefined,
  getPlanValue: (
    macro: string,
    category: string,
    detail: string,
    year: number,
    monthIndex: number
  ) => number,
  year: number,
  monthIndex: number
): number => {
  const macro = causaliCatalog.find(m => m.macroId === macroId);
  if (!macro) {
    return 0;
  }

  const result = macro.categories.reduce((catAcc, cat) => {
    const macroData = planYear?.macros.find(
      m => m.macro === macro.macroCategory
    );
    const categoryDetails =
      macroData?.details?.filter(d => d.category === cat.name) ?? [];

    return (
      catAcc +
      categoryDetails.reduce(
        (detailAcc, d) =>
          detailAcc +
          getPlanValue(
            macro.macroCategory,
            cat.name,
            d.detail,
            year,
            monthIndex
          ),
        0
      )
    );
  }, 0);

  return result;
};

// Get INCASSATO total (macroId: 1) - following golden rule #1
export const getIncassatoTotal = (
  causaliCatalog: FinancialCausaleGroup[],
  planYear: PlanYearData | undefined,
  getPlanValue: (
    macro: string,
    category: string,
    detail: string,
    year: number,
    monthIndex: number
  ) => number,
  year: number,
  monthIndex: number
): number => {
  const result = getMacroTotal(
    1,
    causaliCatalog,
    planYear,
    getPlanValue,
    year,
    monthIndex
  );

  return result;
};

// Get COSTI FISSI total (macroId: 2) - following golden rule #1
export const getCostiFissiTotal = (
  causaliCatalog: FinancialCausaleGroup[],
  planYear: PlanYearData | undefined,
  getPlanValue: (
    macro: string,
    category: string,
    detail: string,
    year: number,
    monthIndex: number
  ) => number,
  year: number,
  monthIndex: number
): number => {
  return getMacroTotal(
    2,
    causaliCatalog,
    planYear,
    getPlanValue,
    year,
    monthIndex
  );
};

// Get COSTI VARIABILI total (macroId: 3) - following golden rule #1
export const getCostiVariabiliTotal = (
  causaliCatalog: FinancialCausaleGroup[],
  planYear: PlanYearData | undefined,
  getPlanValue: (
    macro: string,
    category: string,
    detail: string,
    year: number,
    monthIndex: number
  ) => number,
  year: number,
  monthIndex: number
): number => {
  return getMacroTotal(
    3,
    causaliCatalog,
    planYear,
    getPlanValue,
    year,
    monthIndex
  );
};

// Calculate utile using macro totals in correct order (following golden rule #2)
export const calculateUtileFromMacroTotals = (
  causaliCatalog: FinancialCausaleGroup[],
  planYear: PlanYearData | undefined,
  getPlanConsuntivoValue: (
    macro: string,
    category: string,
    detail: string,
    year: number,
    monthIndex: number
  ) => number,
  year: number,
  monthIndex: number
): number => {
  const incassato = getIncassatoTotal(
    causaliCatalog,
    planYear,
    getPlanConsuntivoValue,
    year,
    monthIndex
  );
  const costiFissi = getCostiFissiTotal(
    causaliCatalog,
    planYear,
    getPlanConsuntivoValue,
    year,
    monthIndex
  );
  const costiVariabili = getCostiVariabiliTotal(
    causaliCatalog,
    planYear,
    getPlanConsuntivoValue,
    year,
    monthIndex
  );

  // Golden rule #2: Utile = Tipologia1 - Tipologia2 - Tipologia3
  return incassato - costiFissi - costiVariabili;
};

// Compute year metrics from plan data and financial stats
export const computeYearMetrics = (
  basePlanByYear: Map<number, PlanYearData>,
  financialStatsRows: FinancialStatsRow[],
  statsOverrides?: Record<string, any>,
  getPlanConsuntivoValue?: (
    macro: string,
    category: string,
    detail: string,
    year: number,
    monthIndex: number
  ) => number
): Map<number, BusinessPlanYearMetrics> => {
  const yearMetrics = new Map<number, BusinessPlanYearMetrics>();

  // Build stats map for efficient lookup
  const statsMap = new Map<
    string,
    FinancialStatsRow & { year: number; monthIndex: number }
  >();

  financialStatsRows.forEach(row => {
    const parsed = parsePlanMonthLabel(row.month);
    if (!parsed) return;
    const { year, monthIndex } = parsed;
    const monthKey = buildMonthKey(year, monthIndex);
    statsMap.set(monthKey, { ...row, year, monthIndex });
  });

  // Process each year
  basePlanByYear.forEach((planYear, year) => {
    const monthlyFatturato: number[] = [];
    const monthlyIncassato: number[] = [];
    const monthlyCostiFissi: number[] = [];
    const monthlyCostiVariabili: number[] = [];

    let fatturatoTotale = 0;
    let incassato = 0;
    let costiFissi = 0;
    let costiVariabili = 0;

    // Process each month
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthKey = buildMonthKey(year, monthIndex);
      const statsData = statsMap.get(monthKey);

      // FATTURATO: sempre da statistiche usando fatturatoTotale (non fatturatoImponibile)
      let monthFatturato = 0;
      if (statsData) {
        monthFatturato = statsData.fatturatoTotale ?? 0;
      } else if (statsOverrides) {
        // Fallback to statsOverrides if financialStatsRows is empty
        // Usa direttamente fatturatoTotale, non calcolarlo da fatturatoImponibile + corrispettivi
        const fatturatoTotale =
          statsOverrides[`${monthKey}|fatturatoTotale`] ?? null;

        if (fatturatoTotale !== null) {
          monthFatturato = fatturatoTotale;
        } else {
          // Ultimo fallback: calcola da componenti solo se fatturatoTotale non è disponibile
          const fatturatoImponibile =
            statsOverrides[`${monthKey}|fatturatoImponibile`] ?? 0;
          const corrispettivi =
            statsOverrides[`${monthKey}|corrispettivi`] ?? 0;
          monthFatturato = fatturatoImponibile + corrispettivi;
        }
      }

      // INCASSATO: sempre da piano mensile (consuntivo)
      let monthIncassato = 0;
      if (getPlanConsuntivoValue) {
        // Use getPlanConsuntivoValue to get real data from InserisciDati
        const incassatoMacro = planYear.macros.find(
          m => m.macro === 'INCASSATO'
        );
        if (incassatoMacro) {
          monthIncassato = incassatoMacro.details.reduce((acc, detail) => {
            const value = getPlanConsuntivoValue(
              'INCASSATO',
              detail.category,
              detail.detail,
              year,
              monthIndex
            );
            return acc + value;
          }, 0);
        }
      } else {
        // Fallback to direct access (for backward compatibility)
        monthIncassato = planYear.macros
          .filter(macro => macro.macro === 'INCASSATO')
          .reduce((acc, macro) => {
            return (
              acc +
              macro.details.reduce((detailAcc, detail) => {
                return detailAcc + (detail.months[monthIndex]?.consuntivo ?? 0);
              }, 0)
            );
          }, 0);
      }

      // COSTI FISSI: sempre da piano mensile (consuntivo)
      let monthCostiFissi = 0;
      if (getPlanConsuntivoValue) {
        const costiFissiMacro = planYear.macros.find(
          m => m.macro === 'COSTI FISSI'
        );
        if (costiFissiMacro) {
          monthCostiFissi = costiFissiMacro.details.reduce((acc, detail) => {
            return (
              acc +
              getPlanConsuntivoValue(
                'COSTI FISSI',
                detail.category,
                detail.detail,
                year,
                monthIndex
              )
            );
          }, 0);
        }
      } else {
        monthCostiFissi = planYear.macros
          .filter(macro => macro.macro === 'COSTI FISSI')
          .reduce((acc, macro) => {
            return (
              acc +
              macro.details.reduce((detailAcc, detail) => {
                return detailAcc + (detail.months[monthIndex]?.consuntivo ?? 0);
              }, 0)
            );
          }, 0);
      }

      // COSTI VARIABILI: sempre da piano mensile (consuntivo)
      let monthCostiVariabili = 0;
      if (getPlanConsuntivoValue) {
        const costiVariabiliMacro = planYear.macros.find(
          m => m.macro === 'COSTI VARIABILI'
        );
        if (costiVariabiliMacro) {
          monthCostiVariabili = costiVariabiliMacro.details.reduce(
            (acc, detail) => {
              return (
                acc +
                getPlanConsuntivoValue(
                  'COSTI VARIABILI',
                  detail.category,
                  detail.detail,
                  year,
                  monthIndex
                )
              );
            },
            0
          );
        }
      } else {
        monthCostiVariabili = planYear.macros
          .filter(macro => macro.macro === 'COSTI VARIABILI')
          .reduce((acc, macro) => {
            return (
              acc +
              macro.details.reduce((detailAcc, detail) => {
                return detailAcc + (detail.months[monthIndex]?.consuntivo ?? 0);
              }, 0)
            );
          }, 0);
      }

      monthlyFatturato.push(monthFatturato);
      monthlyIncassato.push(monthIncassato);
      monthlyCostiFissi.push(monthCostiFissi);
      monthlyCostiVariabili.push(monthCostiVariabili);

      fatturatoTotale += monthFatturato;
      incassato += monthIncassato;
      costiFissi += monthCostiFissi;
      costiVariabili += monthCostiVariabili;
    }

    yearMetrics.set(year, {
      fatturatoTotale,
      monthlyFatturato,
      incassato,
      monthlyIncassato,
      costiFissi,
      monthlyCostiFissi,
      costiVariabili,
      monthlyCostiVariabili,
    });
  });

  return yearMetrics;
};
