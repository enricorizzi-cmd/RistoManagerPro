// useFinancialMetrics Hook - Financial metrics calculations
import { useMemo } from 'react';
import type { FinancialDataPoint } from '../types/dashboard.types';
import {
  calculateYTD,
  calculateChangePercent,
} from '../utils/dashboardCalculations';
import { parseMonthLabel } from '../utils/formatters';

export function useFinancialMetrics(data: FinancialDataPoint[]) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const metrics = useMemo(() => {
    const ytdFatturato = calculateYTD(data, currentYear, 'fatturato');
    const ytdUtile = calculateYTD(data, currentYear, 'utile');
    const ytdIncassato = calculateYTD(data, currentYear, 'incassato');

    // Previous year comparison
    const prevYearFatturato = calculateYTD(data, currentYear - 1, 'fatturato');
    const prevYearUtile = calculateYTD(data, currentYear - 1, 'utile');

    // Current month data
    const currentMonthData = data.find(d => {
      const parsed = parseMonthLabel(d.month);
      return (
        parsed &&
        parsed.year === currentYear &&
        parsed.monthIndex === currentMonth
      );
    });

    // Previous month data
    const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthData = data.find(d => {
      const parsed = parseMonthLabel(d.month);
      return (
        parsed &&
        parsed.year === prevMonthYear &&
        parsed.monthIndex === prevMonthIndex
      );
    });

    return {
      ytd: {
        fatturato: ytdFatturato,
        utile: ytdUtile,
        incassato: ytdIncassato,
        margine: ytdFatturato > 0 ? (ytdUtile / ytdFatturato) * 100 : 0,
      },
      currentMonth: {
        fatturato: currentMonthData?.fatturato || 0,
        utile: currentMonthData?.utile || 0,
        incassato: currentMonthData?.incassato || 0,
      },
      previousMonth: {
        fatturato: prevMonthData?.fatturato || 0,
        utile: prevMonthData?.utile || 0,
        incassato: prevMonthData?.incassato || 0,
      },
      yearOverYear: {
        fatturatoChange: calculateChangePercent(
          ytdFatturato,
          prevYearFatturato
        ),
        utileChange: calculateChangePercent(ytdUtile, prevYearUtile),
      },
    };
  }, [data, currentYear, currentMonth]);

  return metrics;
}
