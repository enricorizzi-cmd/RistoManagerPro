// Business Plan Logic
// Business plan calculations and form management

import { round2, parseNumberInput } from './financialPlanUtils';
import type { BusinessPlanYearMetrics } from './financialCalculations';

export interface BusinessPlanDraft {
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
  createdAt: string;
}

export type BusinessPlanDrafts = Record<string, BusinessPlanDraft>;

export interface BusinessPlanFormState {
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

export interface BusinessPlanMessage {
  type: 'success' | 'info' | 'error';
  text: string;
}

export const createBusinessPlanFormFromMetrics = (
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

export const createBusinessPlanFormFromDraft = (
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

// Funzione per calcolare le incidenze mensili di una singola riga
export const calculateMonthlyRatios = (
  monthlyValues: number[],
  totalValue: number,
): number[] => {
  if (totalValue === 0) {
    return new Array(12).fill(0);
  }
  return monthlyValues.map(value => value / totalValue);
};

// Funzione per calcolare la media delle incidenze mensili tra più anni
export const calculateAverageMonthlyRatios = (
  yearMetrics: Map<number, BusinessPlanYearMetrics>,
  baseYears: number[],
  macroCategory: 'INCASSATO' | 'COSTI FISSI' | 'COSTI VARIABILI',
): number[] => {
  if (baseYears.length === 0) {
    return new Array(12).fill(1/12); // Distribuzione uniforme se non ci sono dati
  }

  const ratiosByYear: number[][] = [];
  
  baseYears.forEach(year => {
    const metrics = yearMetrics.get(year);
    if (!metrics) return;

    let monthlyValues: number[];
    let totalValue: number;

    switch (macroCategory) {
      case 'INCASSATO':
        monthlyValues = metrics.monthlyIncassato || [];
        totalValue = metrics.incassato;
        break;
      case 'COSTI FISSI':
        monthlyValues = metrics.monthlyCostiFissi || [];
        totalValue = metrics.costiFissi;
        break;
      case 'COSTI VARIABILI':
        monthlyValues = metrics.monthlyCostiVariabili || [];
        totalValue = metrics.costiVariabili;
        break;
      default:
        return;
    }

    if (monthlyValues.length === 12 && totalValue > 0) {
      ratiosByYear.push(calculateMonthlyRatios(monthlyValues, totalValue));
    }
  });

  if (ratiosByYear.length === 0) {
    return new Array(12).fill(1/12);
  }

  // Calcola la media delle incidenze mensili
  const averageRatios: number[] = [];
  for (let month = 0; month < 12; month++) {
    const monthRatios = ratiosByYear.map(yearRatios => yearRatios[month]);
    const average = monthRatios.reduce((sum, ratio) => sum + ratio, 0) / monthRatios.length;
    averageRatios.push(average);
  }

  return averageRatios;
};

// Funzione per distribuire un valore annuale sui 12 mesi basandosi sulle incidenze
export const distributeAnnualValueToMonths = (
  annualValue: number,
  monthlyRatios: number[],
): number[] => {
  return monthlyRatios.map(ratio => round2(annualValue * ratio));
};

export const recalcBusinessPlan = (
  draft: BusinessPlanFormState,
  yearMetrics: Map<number, BusinessPlanYearMetrics>,
  changedField?:
    | 'fatturatoIncrement'
    | 'fatturatoValue'
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

  let fatturatoIncrement = parseNumberInput(draft.fatturatoIncrement) ?? 0;
  let fatturatoPrevisionale = parseNumberInput(draft.fatturatoPrevisionale);

  if (changedField === 'fatturatoIncrement') {
    fatturatoIncrement = fatturatoIncrement ?? 0;
    fatturatoPrevisionale = round2(fatturatoBase * (1 + fatturatoIncrement / 100));
  } else if (changedField === 'fatturatoValue') {
    fatturatoPrevisionale = fatturatoPrevisionale ?? fatturatoBase;
    fatturatoIncrement = fatturatoBase === 0 ? 0 : round2(((fatturatoPrevisionale - fatturatoBase) / fatturatoBase) * 100);
  } else {
    if (fatturatoPrevisionale === null) {
      fatturatoPrevisionale = round2(fatturatoBase * (1 + fatturatoIncrement / 100));
    } else {
      fatturatoIncrement = fatturatoBase === 0 ? 0 : round2(((fatturatoPrevisionale - fatturatoBase) / fatturatoBase) * 100);
    }
  }

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
    fatturatoIncrement: fatturatoIncrement.toFixed(2),
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
};
