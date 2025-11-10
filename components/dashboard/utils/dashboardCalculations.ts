// Dashboard Calculations - Business logic for metrics and aggregations

import type { FinancialDataPoint, BCGRecipe } from '../types/dashboard.types';
import { parseMonthLabel } from './formatters';

export function calculateChangePercent(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function calculateYTD(
  data: FinancialDataPoint[],
  year: number,
  field: keyof FinancialDataPoint
): number {
  const currentMonth = new Date().getMonth();
  return data
    .filter(d => {
      const parsed = parseMonthLabel(d.month);
      return (
        parsed &&
        parsed.year === year &&
        parsed.monthIndex <= currentMonth &&
        d[field] !== null
      );
    })
    .reduce((sum, d) => sum + ((d[field] as number) || 0), 0);
}

export function calculateSparkline(
  data: FinancialDataPoint[],
  field: keyof FinancialDataPoint,
  periods: number = 7
): number[] {
  const sorted = [...data]
    .filter(d => d[field] !== null)
    .sort((a, b) => {
      const aParsed = parseMonthLabel(a.month);
      const bParsed = parseMonthLabel(b.month);
      if (!aParsed || !bParsed) return 0;
      if (aParsed.year !== bParsed.year) return aParsed.year - bParsed.year;
      return aParsed.monthIndex - bParsed.monthIndex;
    })
    .slice(-periods);

  return sorted.map(d => (d[field] as number) || 0);
}

export function calculateBCGQuadrants(recipes: BCGRecipe[]): {
  stars: BCGRecipe[];
  plowhorses: BCGRecipe[];
  puzzles: BCGRecipe[];
  dogs: BCGRecipe[];
} {
  const avgPopolarita =
    recipes.reduce((sum, r) => sum + r.popolarita, 0) / recipes.length || 0;
  const avgMarginalita =
    recipes.reduce((sum, r) => sum + r.marginalita, 0) / recipes.length || 0;

  return {
    stars: recipes.filter(
      r => r.popolarita >= avgPopolarita && r.marginalita >= avgMarginalita
    ),
    plowhorses: recipes.filter(
      r => r.popolarita >= avgPopolarita && r.marginalita < avgMarginalita
    ),
    puzzles: recipes.filter(
      r => r.popolarita < avgPopolarita && r.marginalita >= avgMarginalita
    ),
    dogs: recipes.filter(
      r => r.popolarita < avgPopolarita && r.marginalita < avgMarginalita
    ),
  };
}

export function calculateMarginePercent(
  utile: number,
  fatturato: number
): number {
  if (fatturato === 0) return 0;
  return (utile / fatturato) * 100;
}

export function aggregateFinancialData(
  data: FinancialDataPoint[],
  _period: 'month' | 'quarter' | 'year'
): FinancialDataPoint[] {
  // Implementation for aggregation by period
  // For now, return as-is
  return data;
}
