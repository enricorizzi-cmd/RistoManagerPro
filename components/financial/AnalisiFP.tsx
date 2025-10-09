// Analisi FP Component
// Displays dynamic financial indicators and analysis

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatCurrencyValue, parseMonthKey, buildMonthKey, parsePlanMonthLabel } from '../../utils/financialPlanUtils';
import { calculateUtileFromMacroTotals, getIncassatoTotal, getCostiFissiTotal, getCostiVariabiliTotal } from '../../utils/financialCalculations';
import type { FinancialStatsRow } from '../../data/financialPlanData';
import type { StatsOverrides } from '../../types';

interface AnalisiFPProps {
  availableYears: number[];
  statsOverrides: StatsOverrides;
  financialStatsRows: FinancialStatsRow[];
  getPlanPreventivoValue: (macro: string, category: string, detail: string, year: number, monthIndex: number) => number;
  getPlanConsuntivoValue: (macro: string, category: string, detail: string, year: number, monthIndex: number) => number;
  causaliCatalog: any[];
  planYear: any;
}

interface IndicatorData {
  label: string;
  lastMonthValues: { currentValue: number | null; previousValue: number | null };
  lastMonth: number | null;
  ytdValues: { currentValue: number | null; previousValue: number | null };
  ytd: number | null;
  last12MonthsValues: { currentValue: number | null; previousValue: number | null };
  last12Months: number | null;
  unit: string;
}

export const AnalisiFP: React.FC<AnalisiFPProps> = ({
  availableYears,
  statsOverrides,
  financialStatsRows,
  getPlanPreventivoValue,
  getPlanConsuntivoValue,
  causaliCatalog,
  planYear,
}) => {
  const analysisData = useMemo(() => {
    const getFieldValue = (data: any, field: string) => {
      if (!data) return null;
      const overrideKey = `${data.monthKey || ''}|${field}`;
      return statsOverrides[overrideKey] ?? data[field];
    };

    // Build stats map
    const statsMap = new Map<string, FinancialStatsRow & { year: number; monthIndex: number }>();
    
    financialStatsRows.forEach((row) => {
      const parsed = parsePlanMonthLabel(row.month);
      if (!parsed) return;
      const { year, monthIndex } = parsed;
      const monthKey = buildMonthKey(year, monthIndex);
      statsMap.set(monthKey, { ...row, year, monthIndex });
    });

    // Apply overrides
    Object.entries(statsOverrides).forEach(([monthKey, override]) => {
      const parsed = parseMonthKey(monthKey);
      if (!parsed) return;
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
        fatturatoPrevisionale: (override as any).fatturatoPrevisionale ?? (base as any)?.fatturatoPrevisionale ?? null,
        incassatoPrevisionale: (override as any).incassatoPrevisionale ?? (base as any)?.incassatoPrevisionale ?? null,
        utilePrevisionale: (override as any).utilePrevisionale ?? (base as any)?.utilePrevisionale ?? null,
        year,
        monthIndex,
      } as FinancialStatsRow & { year: number; monthIndex: number });
    });

    // Build complete data array
    const allData: Array<{
      year: number;
      monthIndex: number;
      monthKey: string;
      fatturatoTotale: number | null;
      incassato: number | null;
      saldoTotale: number | null;
      creditiPendenti: number | null;
      creditiScaduti: number | null;
      debitiFornitore: number | null;
      debitiBancari: number | null;
      costiFissi: number;
      costiVariabili: number;
      utile: number;
    }> = [];

    availableYears.forEach((year) => {
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const monthKey = buildMonthKey(year, monthIndex);
        const data = statsMap.get(monthKey);
        
        // Get plan values (following golden rule #1)
        const incassato = getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex);
        const costiFissi = getCostiFissiTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex);
        const costiVariabili = getCostiVariabiliTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex);
        const utile = calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex);

        const dataWithKey = { ...data, monthKey };
        
        // Get fatturato from statistics, fallback to incassato if not available
        const fatturatoFromStats = getFieldValue(dataWithKey, 'fatturatoTotale');
        const fatturatoImponibile = getFieldValue(dataWithKey, 'fatturatoImponibile');
        let fatturatoTotale = fatturatoFromStats;
        if (fatturatoTotale === null || fatturatoTotale === undefined) {
          fatturatoTotale = fatturatoImponibile;
        }
        if (fatturatoTotale === null || fatturatoTotale === undefined) {
          fatturatoTotale = incassato;
        }
        
        // Get saldo from statistics
        const saldoConto = getFieldValue(dataWithKey, 'saldoConto');
        const saldoSecondoConto = getFieldValue(dataWithKey, 'saldoSecondoConto');
        let saldoTotale = getFieldValue(dataWithKey, 'saldoTotale');
        if (saldoTotale === null || saldoTotale === undefined) {
          const saldoSum = (saldoConto ?? 0) + (saldoSecondoConto ?? 0);
          saldoTotale = saldoSum > 0 ? saldoSum : null;
        }
        
        allData.push({
          year,
          monthIndex,
          monthKey,
          fatturatoTotale,
          incassato,
          saldoTotale,
          creditiPendenti: getFieldValue(dataWithKey, 'creditiPendenti') ?? null,
          creditiScaduti: getFieldValue(dataWithKey, 'creditiScaduti') ?? null,
          debitiFornitore: getFieldValue(dataWithKey, 'debitiFornitore') ?? null,
          debitiBancari: getFieldValue(dataWithKey, 'debitiBancari') ?? null,
          costiFissi,
          costiVariabili,
          utile,
        });
      }
    });

    // Find last compiled month (or use current month if no data)
    const lastCompiledMonth = allData
      .filter(d => d.incassato !== null && d.incassato !== 0)
      .sort((a, b) => b.year - a.year || b.monthIndex - a.monthIndex)[0] 
      || allData.sort((a, b) => b.year - a.year || b.monthIndex - a.monthIndex)[0];


    if (!lastCompiledMonth) {
      return {
        indicators: [],
        previsionaleConsuntivo: [],
        lastCompiledMonth: 'Nessun dato disponibile',
      };
    }

    const currentYear = lastCompiledMonth.year;
    const currentMonth = lastCompiledMonth.monthIndex;

    // Helper function to calculate percentage change
    const calculatePercentageChange = (current: number, previous: number): number | null => {
      if (previous === 0) return current > 0 ? 100 : null;
      return ((current - previous) / previous) * 100;
    };

    // Helper function to get value for same month previous year
    const getSameMonthPreviousYear = (field: keyof typeof lastCompiledMonth) => {
      const prevYearData = allData.find(d => d.year === currentYear - 1 && d.monthIndex === currentMonth);
      return prevYearData?.[field] ?? null;
    };

    // Helper function to get current and previous year values for last month
    const getLastMonthValues = (field: keyof typeof lastCompiledMonth) => {
      const currentValue = lastCompiledMonth[field];
      const previousValue = getSameMonthPreviousYear(field);
      return { currentValue, previousValue };
    };

    // Helper function to get debiti pendenti values (sum of debitiFornitore + debitiBancari)
    const getDebitiPendentiValues = () => {
      const currentValue = (lastCompiledMonth.debitiFornitore ?? 0) + (lastCompiledMonth.debitiBancari ?? 0);
      const prevYearData = allData.find(d => d.year === currentYear - 1 && d.monthIndex === currentMonth);
      const previousValue = prevYearData ? (prevYearData.debitiFornitore ?? 0) + (prevYearData.debitiBancari ?? 0) : null;
      return { currentValue, previousValue };
    };

    // Helper function to get incidenza values (ratio of field to incassato)
    const getIncidenzaValues = (field: keyof typeof lastCompiledMonth) => {
      const currentValue = lastCompiledMonth.incassato ? (lastCompiledMonth[field] / lastCompiledMonth.incassato) * 100 : null;
      const prevYearData = allData.find(d => d.year === currentYear - 1 && d.monthIndex === currentMonth);
      const previousValue = prevYearData && prevYearData.incassato ? (prevYearData[field] / prevYearData.incassato) * 100 : null;
      return { currentValue, previousValue };
    };

    // Helper function to get YTD values with averages for saldo/crediti/debiti
    const getYTDAverageValues = (field: keyof typeof lastCompiledMonth) => {
      const ytdData = getYTDValues(field);
      const currentAvg = ytdData.currentYTD / (currentMonth + 1);
      const previousAvg = ytdData.previousYTD / (currentMonth + 1);
      return { currentValue: currentAvg, previousValue: previousAvg };
    };

    // Helper function to get 12 months values with averages for saldo/crediti/debiti
    const get12MonthsAverageValues = (field: keyof typeof lastCompiledMonth) => {
      const months12Data = getLast12MonthsValues(field);
      const currentAvg = months12Data.last12Months / 12;
      const previousAvg = months12Data.previous12Months / 12;
      return { currentValue: currentAvg, previousValue: previousAvg };
    };

    // Helper function to get debiti pendenti YTD values (sum of debitiFornitore + debitiBancari)
    const getDebitiPendentiYTDValues = () => {
      const ytdData = debitiPendentiYTD;
      const currentAvg = ytdData.currentYTD / (currentMonth + 1);
      const previousAvg = ytdData.previousYTD / (currentMonth + 1);
      return { currentValue: currentAvg, previousValue: previousAvg };
    };

    // Helper function to get debiti pendenti 12 months values (sum of debitiFornitore + debitiBancari)
    const getDebitiPendenti12MonthsValues = () => {
      const months12Data = debitiPendenti12Months;
      const currentAvg = months12Data.last12Months / 12;
      const previousAvg = months12Data.previous12Months / 12;
      return { currentValue: currentAvg, previousValue: previousAvg };
    };

    // Helper function to get incidenza YTD values (ratio of field to incassato)
    const getIncidenzaYTDValues = (field: keyof typeof lastCompiledMonth) => {
      const ytdData = getYTDValues(field);
      const incassatoYTDData = getYTDValues('incassato');
      const currentValue = incassatoYTDData.currentYTD ? (ytdData.currentYTD / incassatoYTDData.currentYTD) * 100 : null;
      const previousValue = incassatoYTDData.previousYTD ? (ytdData.previousYTD / incassatoYTDData.previousYTD) * 100 : null;
      return { currentValue, previousValue };
    };

    // Helper function to get incidenza 12 months values (ratio of field to incassato)
    const getIncidenza12MonthsValues = (field: keyof typeof lastCompiledMonth) => {
      const months12Data = getLast12MonthsValues(field);
      const incassato12MonthsData = getLast12MonthsValues('incassato');
      const currentValue = incassato12MonthsData.last12Months ? (months12Data.last12Months / incassato12MonthsData.last12Months) * 100 : null;
      const previousValue = incassato12MonthsData.previous12Months ? (months12Data.previous12Months / incassato12MonthsData.previous12Months) * 100 : null;
      return { currentValue, previousValue };
    };

    // Helper function to get YTD values
    const getYTDValues = (field: keyof typeof lastCompiledMonth) => {
      const currentYTD = allData
        .filter(d => d.year === currentYear && d.monthIndex <= currentMonth)
        .reduce((sum, d) => sum + (d[field] as number ?? 0), 0);
      
      const previousYTD = allData
        .filter(d => d.year === currentYear - 1 && d.monthIndex <= currentMonth)
        .reduce((sum, d) => sum + (d[field] as number ?? 0), 0);
      
      return { currentYTD, previousYTD };
    };

    // Helper function to get last 12 months values
    const getLast12MonthsValues = (field: keyof typeof lastCompiledMonth) => {
      const last12Months = allData
        .filter(d => {
          const dDate = new Date(d.year, d.monthIndex, 1);
          const currentDate = new Date(currentYear, currentMonth, 1);
          const diffMonths = (currentDate.getFullYear() - dDate.getFullYear()) * 12 + (currentDate.getMonth() - dDate.getMonth());
          return diffMonths >= 0 && diffMonths < 12;
        })
        .reduce((sum, d) => sum + (d[field] as number ?? 0), 0);
      
      const previous12Months = allData
        .filter(d => {
          const dDate = new Date(d.year, d.monthIndex, 1);
          const currentDate = new Date(currentYear, currentMonth, 1);
          const diffMonths = (currentDate.getFullYear() - dDate.getFullYear()) * 12 + (currentDate.getMonth() - dDate.getMonth());
          return diffMonths >= 12 && diffMonths < 24;
        })
        .reduce((sum, d) => sum + (d[field] as number ?? 0), 0);
      
      return { last12Months, previous12Months };
    };

    // Calculate indicators - always show all fields even if empty
    const indicators: IndicatorData[] = [];

    // FATTURATO
    const fatturatoLastMonth = getSameMonthPreviousYear('fatturatoTotale');
    const fatturatoYTD = getYTDValues('fatturatoTotale');
    const fatturato12Months = getLast12MonthsValues('fatturatoTotale');
    const fatturatoValues = getLastMonthValues('fatturatoTotale');
    
    indicators.push({
      label: 'FATTURATO',
      lastMonthValues: fatturatoValues,
      lastMonth: fatturatoLastMonth ? calculatePercentageChange(lastCompiledMonth.fatturatoTotale ?? 0, fatturatoLastMonth) : null,
      ytdValues: { currentValue: fatturatoYTD.currentYTD, previousValue: fatturatoYTD.previousYTD },
      ytd: fatturatoYTD.previousYTD ? calculatePercentageChange(fatturatoYTD.currentYTD, fatturatoYTD.previousYTD) : null,
      last12MonthsValues: { currentValue: fatturato12Months.last12Months, previousValue: fatturato12Months.previous12Months },
      last12Months: fatturato12Months.previous12Months ? calculatePercentageChange(fatturato12Months.last12Months, fatturato12Months.previous12Months) : null,
      unit: '%',
    });

    // INCASSATO
    const incassatoLastMonth = getSameMonthPreviousYear('incassato');
    const incassatoYTD = getYTDValues('incassato');
    const incassato12Months = getLast12MonthsValues('incassato');
    const incassatoValues = getLastMonthValues('incassato');
    
    indicators.push({
      label: 'INCASSATO',
      lastMonthValues: incassatoValues,
      lastMonth: incassatoLastMonth ? calculatePercentageChange(lastCompiledMonth.incassato ?? 0, incassatoLastMonth) : null,
      ytdValues: { currentValue: incassatoYTD.currentYTD, previousValue: incassatoYTD.previousYTD },
      ytd: incassatoYTD.previousYTD ? calculatePercentageChange(incassatoYTD.currentYTD, incassatoYTD.previousYTD) : null,
      last12MonthsValues: { currentValue: incassato12Months.last12Months, previousValue: incassato12Months.previous12Months },
      last12Months: incassato12Months.previous12Months ? calculatePercentageChange(incassato12Months.last12Months, incassato12Months.previous12Months) : null,
      unit: '%',
    });

    // SALDO CC (calculate average for comparison)
    const saldoCCLastMonth = getSameMonthPreviousYear('saldoTotale');
    const saldoCCYTD = getYTDValues('saldoTotale');
    const saldoCC12Months = getLast12MonthsValues('saldoTotale');
    
    // For saldo CC, compare averages instead of sums
    const saldoCCYTDCurrentAvg = saldoCCYTD.currentYTD / (currentMonth + 1);
    const saldoCCYTDPreviousAvg = saldoCCYTD.previousYTD / (currentMonth + 1);
    const saldoCC12MonthsCurrentAvg = saldoCC12Months.last12Months / 12;
    const saldoCC12MonthsPreviousAvg = saldoCC12Months.previous12Months / 12;
    
    
    const saldoCCValues = getLastMonthValues('saldoTotale');
    
    const saldoCCYTDValues = getYTDAverageValues('saldoTotale');
    const saldoCC12MonthsValues = get12MonthsAverageValues('saldoTotale');
    
    indicators.push({
      label: 'SALDO CC',
      lastMonthValues: saldoCCValues,
      lastMonth: saldoCCLastMonth ? calculatePercentageChange(lastCompiledMonth.saldoTotale ?? 0, saldoCCLastMonth) : null,
      ytdValues: saldoCCYTDValues,
      ytd: saldoCCYTDPreviousAvg ? calculatePercentageChange(saldoCCYTDCurrentAvg, saldoCCYTDPreviousAvg) : null,
      last12MonthsValues: saldoCC12MonthsValues,
      last12Months: saldoCC12MonthsPreviousAvg ? calculatePercentageChange(saldoCC12MonthsCurrentAvg, saldoCC12MonthsPreviousAvg) : null,
      unit: '%',
    });

    // CREDITI PENDENTI
    const creditiPendentiLastMonth = getSameMonthPreviousYear('creditiPendenti');
    const creditiPendentiYTD = getYTDValues('creditiPendenti');
    const creditiPendenti12Months = getLast12MonthsValues('creditiPendenti');
    
    const creditiPendentiYTDCurrentAvg = creditiPendentiYTD.currentYTD / (currentMonth + 1);
    const creditiPendentiYTDPreviousAvg = creditiPendentiYTD.previousYTD / (currentMonth + 1);
    const creditiPendenti12MonthsCurrentAvg = creditiPendenti12Months.last12Months / 12;
    const creditiPendenti12MonthsPreviousAvg = creditiPendenti12Months.previous12Months / 12;
    
    
    const creditiPendentiValues = getLastMonthValues('creditiPendenti');
    
    const creditiPendentiYTDValues = getYTDAverageValues('creditiPendenti');
    const creditiPendenti12MonthsValues = get12MonthsAverageValues('creditiPendenti');
    
    indicators.push({
      label: 'CREDITI PENDENTI',
      lastMonthValues: creditiPendentiValues,
      lastMonth: creditiPendentiLastMonth ? calculatePercentageChange(lastCompiledMonth.creditiPendenti ?? 0, creditiPendentiLastMonth) : null,
      ytdValues: creditiPendentiYTDValues,
      ytd: creditiPendentiYTDPreviousAvg ? calculatePercentageChange(creditiPendentiYTDCurrentAvg, creditiPendentiYTDPreviousAvg) : null,
      last12MonthsValues: creditiPendenti12MonthsValues,
      last12Months: creditiPendenti12MonthsPreviousAvg ? calculatePercentageChange(creditiPendenti12MonthsCurrentAvg, creditiPendenti12MonthsPreviousAvg) : null,
      unit: '%',
    });

    // CREDITI SCADUTI
    const creditiScadutiLastMonth = getSameMonthPreviousYear('creditiScaduti');
    const creditiScadutiYTD = getYTDValues('creditiScaduti');
    const creditiScaduti12Months = getLast12MonthsValues('creditiScaduti');
    
    const creditiScadutiYTDCurrentAvg = creditiScadutiYTD.currentYTD / (currentMonth + 1);
    const creditiScadutiYTDPreviousAvg = creditiScadutiYTD.previousYTD / (currentMonth + 1);
    const creditiScaduti12MonthsCurrentAvg = creditiScaduti12Months.last12Months / 12;
    const creditiScaduti12MonthsPreviousAvg = creditiScaduti12Months.previous12Months / 12;
    
    
    const creditiScadutiValues = getLastMonthValues('creditiScaduti');
    
    const creditiScadutiYTDValues = getYTDAverageValues('creditiScaduti');
    const creditiScaduti12MonthsValues = get12MonthsAverageValues('creditiScaduti');
    
    indicators.push({
      label: 'CREDITI SCADUTI',
      lastMonthValues: creditiScadutiValues,
      lastMonth: creditiScadutiLastMonth ? calculatePercentageChange(lastCompiledMonth.creditiScaduti ?? 0, creditiScadutiLastMonth) : null,
      ytdValues: creditiScadutiYTDValues,
      ytd: creditiScadutiYTDPreviousAvg ? calculatePercentageChange(creditiScadutiYTDCurrentAvg, creditiScadutiYTDPreviousAvg) : null,
      last12MonthsValues: creditiScaduti12MonthsValues,
      last12Months: creditiScaduti12MonthsPreviousAvg ? calculatePercentageChange(creditiScaduti12MonthsCurrentAvg, creditiScaduti12MonthsPreviousAvg) : null,
      unit: '%',
    });

    // DEBITI PENDENTI (sum of debitiFornitore and debitiBancari)
    const debitiPendentiLastMonth = (() => {
      const prevYearData = allData.find(d => d.year === currentYear - 1 && d.monthIndex === currentMonth);
      if (!prevYearData) return null;
      return (prevYearData.debitiFornitore ?? 0) + (prevYearData.debitiBancari ?? 0);
    })();
    
    const debitiPendentiYTD = (() => {
      const currentYTD = allData
        .filter(d => d.year === currentYear && d.monthIndex <= currentMonth)
        .reduce((sum, d) => sum + (d.debitiFornitore ?? 0) + (d.debitiBancari ?? 0), 0);
      
      const previousYTD = allData
        .filter(d => d.year === currentYear - 1 && d.monthIndex <= currentMonth)
        .reduce((sum, d) => sum + (d.debitiFornitore ?? 0) + (d.debitiBancari ?? 0), 0);
      
      return { currentYTD, previousYTD };
    })();
    
    const debitiPendenti12Months = (() => {
      const last12Months = allData
        .filter(d => {
          const dDate = new Date(d.year, d.monthIndex, 1);
          const currentDate = new Date(currentYear, currentMonth, 1);
          const diffMonths = (currentDate.getFullYear() - dDate.getFullYear()) * 12 + (currentDate.getMonth() - dDate.getMonth());
          return diffMonths >= 0 && diffMonths < 12;
        })
        .reduce((sum, d) => sum + (d.debitiFornitore ?? 0) + (d.debitiBancari ?? 0), 0);
      
      const previous12Months = allData
        .filter(d => {
          const dDate = new Date(d.year, d.monthIndex, 1);
          const currentDate = new Date(currentYear, currentMonth, 1);
          const diffMonths = (currentDate.getFullYear() - dDate.getFullYear()) * 12 + (currentDate.getMonth() - dDate.getMonth());
          return diffMonths >= 12 && diffMonths < 24;
        })
        .reduce((sum, d) => sum + (d.debitiFornitore ?? 0) + (d.debitiBancari ?? 0), 0);
      
      return { last12Months, previous12Months };
    })();
    
    const debitiPendentiYTDCurrentAvg = debitiPendentiYTD.currentYTD / (currentMonth + 1);
    const debitiPendentiYTDPreviousAvg = debitiPendentiYTD.previousYTD / (currentMonth + 1);
    const debitiPendenti12MonthsCurrentAvg = debitiPendenti12Months.last12Months / 12;
    const debitiPendenti12MonthsPreviousAvg = debitiPendenti12Months.previous12Months / 12;
    
    
    const debitiPendentiValues = getDebitiPendentiValues();
    
    const debitiPendentiYTDValues = getDebitiPendentiYTDValues();
    const debitiPendenti12MonthsValues = getDebitiPendenti12MonthsValues();
    
    indicators.push({
      label: 'DEBITI PENDENTI',
      lastMonthValues: debitiPendentiValues,
      lastMonth: debitiPendentiLastMonth ? calculatePercentageChange((lastCompiledMonth.debitiFornitore ?? 0) + (lastCompiledMonth.debitiBancari ?? 0), debitiPendentiLastMonth) : null,
      ytdValues: debitiPendentiYTDValues,
      ytd: debitiPendentiYTDPreviousAvg ? calculatePercentageChange(debitiPendentiYTDCurrentAvg, debitiPendentiYTDPreviousAvg) : null,
      last12MonthsValues: debitiPendenti12MonthsValues,
      last12Months: debitiPendenti12MonthsPreviousAvg ? calculatePercentageChange(debitiPendenti12MonthsCurrentAvg, debitiPendenti12MonthsPreviousAvg) : null,
      unit: '%',
    });

    // DEBITI SCADUTI (using debitiFornitore as proxy since no separate field exists in DB)
    const debitiScadutiLastMonth = getSameMonthPreviousYear('debitiFornitore');
    const debitiScadutiYTD = getYTDValues('debitiFornitore');
    const debitiScaduti12Months = getLast12MonthsValues('debitiFornitore');
    
    const debitiScadutiYTDCurrentAvg = debitiScadutiYTD.currentYTD / (currentMonth + 1);
    const debitiScadutiYTDPreviousAvg = debitiScadutiYTD.previousYTD / (currentMonth + 1);
    const debitiScaduti12MonthsCurrentAvg = debitiScaduti12Months.last12Months / 12;
    const debitiScaduti12MonthsPreviousAvg = debitiScaduti12Months.previous12Months / 12;
    
    
    const debitiScadutiValues = getLastMonthValues('debitiFornitore');
    
    const debitiScadutiYTDValues = getYTDAverageValues('debitiFornitore');
    const debitiScaduti12MonthsValues = get12MonthsAverageValues('debitiFornitore');
    
    indicators.push({
      label: 'DEBITI SCADUTI',
      lastMonthValues: debitiScadutiValues,
      lastMonth: debitiScadutiLastMonth ? calculatePercentageChange(lastCompiledMonth.debitiFornitore ?? 0, debitiScadutiLastMonth) : null,
      ytdValues: debitiScadutiYTDValues,
      ytd: debitiScadutiYTDPreviousAvg ? calculatePercentageChange(debitiScadutiYTDCurrentAvg, debitiScadutiYTDPreviousAvg) : null,
      last12MonthsValues: debitiScaduti12MonthsValues,
      last12Months: debitiScaduti12MonthsPreviousAvg ? calculatePercentageChange(debitiScaduti12MonthsCurrentAvg, debitiScaduti12MonthsPreviousAvg) : null,
      unit: '%',
    });

    // Filter data for current year and previous year
    const monthlyData = allData.filter(d => d.year === currentYear);
    const previousYearData = allData.filter(d => d.year === currentYear - 1);

    // COSTI FISSI (calculate YTD and 12 months totals)
    const costiFissiYTD = {
      currentYTD: monthlyData.slice(0, currentMonth + 1).reduce((sum, month) => sum + month.costiFissi, 0),
      previousYTD: previousYearData.slice(0, currentMonth + 1).reduce((sum, month) => sum + month.costiFissi, 0)
    };
    const costiFissi12Months = {
      last12Months: monthlyData.reduce((sum, month) => sum + month.costiFissi, 0),
      previous12Months: previousYearData.reduce((sum, month) => sum + month.costiFissi, 0)
    };

    // COSTI VARIABILI (calculate YTD and 12 months totals)
    const costiVariabiliYTD = {
      currentYTD: monthlyData.slice(0, currentMonth + 1).reduce((sum, month) => sum + month.costiVariabili, 0),
      previousYTD: previousYearData.slice(0, currentMonth + 1).reduce((sum, month) => sum + month.costiVariabili, 0)
    };
    const costiVariabili12Months = {
      last12Months: monthlyData.reduce((sum, month) => sum + month.costiVariabili, 0),
      previous12Months: previousYearData.reduce((sum, month) => sum + month.costiVariabili, 0)
    };

    // UTILE (calculate YTD and 12 months totals)
    const utileYTD = {
      currentYTD: monthlyData.slice(0, currentMonth + 1).reduce((sum, month) => sum + month.utile, 0),
      previousYTD: previousYearData.slice(0, currentMonth + 1).reduce((sum, month) => sum + month.utile, 0)
    };
    const utile12Months = {
      last12Months: monthlyData.reduce((sum, month) => sum + month.utile, 0),
      previous12Months: previousYearData.reduce((sum, month) => sum + month.utile, 0)
    };

    // INCIDENZA COSTI FISSI
    const incidenzaCostiFissiLastMonth = lastCompiledMonth.incassato ? (lastCompiledMonth.costiFissi / lastCompiledMonth.incassato) * 100 : null;
    const incidenzaCostiFissiYTD = incassatoYTD.currentYTD ? (costiFissiYTD.currentYTD / incassatoYTD.currentYTD) * 100 : null;
    const incidenzaCostiFissi12Months = incassato12Months.last12Months ? (costiFissi12Months.last12Months / incassato12Months.last12Months) * 100 : null;
    
    
    const incidenzaCostiFissiValues = getIncidenzaValues('costiFissi');
    
    const incidenzaCostiFissiYTDValues = getIncidenzaYTDValues('costiFissi');
    const incidenzaCostiFissi12MonthsValues = getIncidenza12MonthsValues('costiFissi');
    
    indicators.push({
      label: 'INCIDENZA COSTI FISSI',
      lastMonthValues: incidenzaCostiFissiValues,
      lastMonth: incidenzaCostiFissiLastMonth,
      ytdValues: incidenzaCostiFissiYTDValues,
      ytd: incidenzaCostiFissiYTD,
      last12MonthsValues: incidenzaCostiFissi12MonthsValues,
      last12Months: incidenzaCostiFissi12Months,
      unit: '%',
    });

    // INCIDENZA COSTI VARIABILI
    const incidenzaCostiVariabiliLastMonth = lastCompiledMonth.incassato ? (lastCompiledMonth.costiVariabili / lastCompiledMonth.incassato) * 100 : null;
    const incidenzaCostiVariabiliYTD = incassatoYTD.currentYTD ? (costiVariabiliYTD.currentYTD / incassatoYTD.currentYTD) * 100 : null;
    const incidenzaCostiVariabili12Months = incassato12Months.last12Months ? (costiVariabili12Months.last12Months / incassato12Months.last12Months) * 100 : null;
    
    
    const incidenzaCostiVariabiliValues = getIncidenzaValues('costiVariabili');
    
    const incidenzaCostiVariabiliYTDValues = getIncidenzaYTDValues('costiVariabili');
    const incidenzaCostiVariabili12MonthsValues = getIncidenza12MonthsValues('costiVariabili');
    
    indicators.push({
      label: 'INCIDENZA COSTI VARIABILI',
      lastMonthValues: incidenzaCostiVariabiliValues,
      lastMonth: incidenzaCostiVariabiliLastMonth,
      ytdValues: incidenzaCostiVariabiliYTDValues,
      ytd: incidenzaCostiVariabiliYTD,
      last12MonthsValues: incidenzaCostiVariabili12MonthsValues,
      last12Months: incidenzaCostiVariabili12Months,
      unit: '%',
    });

    // INCIDENZA UTILE
    const incidenzaUtileLastMonth = lastCompiledMonth.incassato ? (lastCompiledMonth.utile / lastCompiledMonth.incassato) * 100 : null;
    const incidenzaUtileYTD = incassatoYTD.currentYTD ? (utileYTD.currentYTD / incassatoYTD.currentYTD) * 100 : null;
    const incidenzaUtile12Months = incassato12Months.last12Months ? (utile12Months.last12Months / incassato12Months.last12Months) * 100 : null;
    
    
    const incidenzaUtileValues = getIncidenzaValues('utile');
    
    const incidenzaUtileYTDValues = getIncidenzaYTDValues('utile');
    const incidenzaUtile12MonthsValues = getIncidenza12MonthsValues('utile');
    
    indicators.push({
      label: 'INCIDENZA UTILE',
      lastMonthValues: incidenzaUtileValues,
      lastMonth: incidenzaUtileLastMonth,
      ytdValues: incidenzaUtileYTDValues,
      ytd: incidenzaUtileYTD,
      last12MonthsValues: incidenzaUtile12MonthsValues,
      last12Months: incidenzaUtile12Months,
      unit: '%',
    });

    // PREVISIONALE / CONSUNTIVO comparison - always show all fields
    const previsionaleConsuntivo = [
      {
        label: 'INCASSATO',
        consuntivo: lastCompiledMonth.incassato,
        previsionale: getPlanPreventivoValue('INCASSATO', 'Incassato', 'Incassato', currentYear, currentMonth),
      },
      {
        label: 'COSTI FISSI',
        consuntivo: lastCompiledMonth.costiFissi,
        previsionale: causaliCatalog
          .find(g => g.macroCategory === 'COSTI FISSI')?.categories
          .reduce((acc, cat) => {
            const macro = planYear?.macros.find(m => m.macro === 'COSTI FISSI');
            const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
            return acc + categoryDetails.reduce((catAcc, d) => catAcc + getPlanPreventivoValue('COSTI FISSI', cat.name, d.detail, currentYear, currentMonth), 0);
          }, 0) ?? 0,
      },
      {
        label: 'COSTI VARIABILI',
        consuntivo: lastCompiledMonth.costiVariabili,
        previsionale: causaliCatalog
          .find(g => g.macroCategory === 'COSTI VARIABILI')?.categories
          .reduce((acc, cat) => {
            const macro = planYear?.macros.find(m => m.macro === 'COSTI VARIABILI');
            const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
            return acc + categoryDetails.reduce((catAcc, d) => catAcc + getPlanPreventivoValue('COSTI VARIABILI', cat.name, d.detail, currentYear, currentMonth), 0);
          }, 0) ?? 0,
      },
      {
        label: 'UTILE',
        consuntivo: lastCompiledMonth.utile,
        previsionale: lastCompiledMonth.incassato - (causaliCatalog
          .find(g => g.macroCategory === 'COSTI FISSI')?.categories
          .reduce((acc, cat) => {
            const macro = planYear?.macros.find(m => m.macro === 'COSTI FISSI');
            const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
            return acc + categoryDetails.reduce((catAcc, d) => catAcc + getPlanPreventivoValue('COSTI FISSI', cat.name, d.detail, currentYear, currentMonth), 0);
          }, 0) ?? 0) - (causaliCatalog
          .find(g => g.macroCategory === 'COSTI VARIABILI')?.categories
          .reduce((acc, cat) => {
            const macro = planYear?.macros.find(m => m.macro === 'COSTI VARIABILI');
            const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
            return acc + categoryDetails.reduce((catAcc, d) => catAcc + getPlanPreventivoValue('COSTI VARIABILI', cat.name, d.detail, currentYear, currentMonth), 0);
          }, 0) ?? 0),
      },
    ];

    return {
      indicators,
      previsionaleConsuntivo,
      lastCompiledMonth: format(new Date(currentYear, currentMonth, 1), 'MMMM yyyy', { locale: it }),
    };
  }, [availableYears, statsOverrides, financialStatsRows, getPlanPreventivoValue, getPlanConsuntivoValue, causaliCatalog, planYear]);

  const formatPercentage = (value: number | null): string => {
    if (value === null) return '-';
    return `${value.toFixed(1)}%`;
  };

  const formatIncidenzaPercentage = (value: number | null): string => {
    if (value === null) return '-';
    return `${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return '-';
    return formatCurrencyValue(value);
  };

  const getChangeColor = (value: number | null): string => {
    if (value === null) return 'text-gray-500';
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Analisi FP - Ultimo mese compilato: {analysisData.lastCompiledMonth}
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">INDICATORE</th>
                <th className="px-4 py-3 text-right">Valori Ultimo Mese</th>
                <th className="px-4 py-3 text-right">Ultimo Mese</th>
                <th className="px-4 py-3 text-right">Valori YTD</th>
                <th className="px-4 py-3 text-right">Progressivo YTD</th>
                <th className="px-4 py-3 text-right">Valori 12 Mesi</th>
                <th className="px-4 py-3 text-right">Progressivo 12 Mesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analysisData.indicators.length > 0 ? (
                analysisData.indicators.map((indicator) => {
                  const isIncidenza = indicator.label.includes('INCIDENZA');
                  const formatFunc = isIncidenza ? formatIncidenzaPercentage : formatPercentage;
                  
                  return (
                    <tr key={indicator.label} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{indicator.label}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        <div className="space-y-1">
                          <div className="text-gray-700">
                            2025: {indicator.lastMonthValues.currentValue !== null ? formatCurrency(indicator.lastMonthValues.currentValue) : '-'}
                          </div>
                          <div className="text-gray-500">
                            2024: {indicator.lastMonthValues.previousValue !== null ? formatCurrency(indicator.lastMonthValues.previousValue) : '-'}
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right ${getChangeColor(indicator.lastMonth)}`}>
                        {formatFunc(indicator.lastMonth)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <div className="space-y-1">
                          <div className="text-gray-700">
                            2025: {indicator.ytdValues.currentValue !== null ? formatCurrency(indicator.ytdValues.currentValue) : '-'}
                          </div>
                          <div className="text-gray-500">
                            2024: {indicator.ytdValues.previousValue !== null ? formatCurrency(indicator.ytdValues.previousValue) : '-'}
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right ${getChangeColor(indicator.ytd)}`}>
                        {formatFunc(indicator.ytd)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <div className="space-y-1">
                          <div className="text-gray-700">
                            2025: {indicator.last12MonthsValues.currentValue !== null ? formatCurrency(indicator.last12MonthsValues.currentValue) : '-'}
                          </div>
                          <div className="text-gray-500">
                            2024: {indicator.last12MonthsValues.previousValue !== null ? formatCurrency(indicator.last12MonthsValues.previousValue) : '-'}
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right ${getChangeColor(indicator.last12Months)}`}>
                        {formatFunc(indicator.last12Months)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                // Show all indicators even if no data
                [
                  'FATTURATO', 'INCASSATO', 'SALDO CC', 'CREDITI PENDENTI', 
                  'CREDITI SCADUTI', 'DEBITI PENDENTI', 'DEBITI SCADUTI',
                  'INCIDENZA COSTI FISSI', 'INCIDENZA COSTI VARIABILI', 'INCIDENZA UTILE'
                ].map((label) => (
                  <tr key={label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{label}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="space-y-1">
                        <div className="text-gray-500">2025: -</div>
                        <div className="text-gray-500">2024: -</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">-</td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="space-y-1">
                        <div className="text-gray-500">2025: -</div>
                        <div className="text-gray-500">2024: -</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">-</td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="space-y-1">
                        <div className="text-gray-500">2025: -</div>
                        <div className="text-gray-500">2024: -</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">-</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Previsionale / Consuntivo - Ultimo mese compilato
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">CAMPO</th>
                <th className="px-4 py-3 text-right">Consuntivo</th>
                <th className="px-4 py-3 text-right">Previsionale</th>
                <th className="px-4 py-3 text-right">Variazione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analysisData.previsionaleConsuntivo.length > 0 ? (
                analysisData.previsionaleConsuntivo.map((item) => {
                  const variazione = item.consuntivo && item.previsionale 
                    ? ((item.consuntivo - item.previsionale) / item.previsionale) * 100 
                    : null;
                  
                  return (
                    <tr key={item.label} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(item.consuntivo)}
                      </td>
                      <td className="px-4 py-3 text-right text-sky-700">
                        {formatCurrency(item.previsionale)}
                      </td>
                      <td className={`px-4 py-3 text-right ${getChangeColor(variazione)}`}>
                        {formatPercentage(variazione)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                // Show all fields even if no data
                ['INCASSATO', 'COSTI FISSI', 'COSTI VARIABILI', 'UTILE'].map((label) => (
                  <tr key={label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{label}</td>
                    <td className="px-4 py-3 text-right text-gray-500">-</td>
                    <td className="px-4 py-3 text-right text-gray-500">-</td>
                    <td className="px-4 py-3 text-right text-gray-500">-</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
