// Analisi FP Component
// Displays dynamic financial indicators and analysis

import React, { useMemo, useState } from 'react';
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
  // State for selected month
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; monthIndex: number } | null>(null);

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

    // Find last compiled month based on consuntivo data only
    const lastCompiledMonth = allData
      .filter(d => d.incassato !== null && d.incassato !== 0) // Only months with consuntivo data
      .sort((a, b) => b.year - a.year || b.monthIndex - a.monthIndex)[0] 
      || allData.sort((a, b) => b.year - a.year || b.monthIndex - a.monthIndex)[0];

    if (!lastCompiledMonth) {
      return {
        indicators: [],
        previsionaleConsuntivo: [],
        lastCompiledMonth: 'Nessun dato disponibile',
        availableMonths: [],
      };
    }

    // Use selected month if available, otherwise use last compiled month
    const currentMonthData = selectedMonth 
      ? allData.find(d => d.year === selectedMonth.year && d.monthIndex === selectedMonth.monthIndex) || lastCompiledMonth
      : lastCompiledMonth;

    const currentYear = currentMonthData.year;
    const currentMonth = currentMonthData.monthIndex;

    // Helper function to calculate percentage change
    const calculatePercentageChange = (current: number, previous: number): number | null => {
      if (previous === 0) return current > 0 ? 100 : null;
      return ((current - previous) / previous) * 100;
    };

    // Helper function to get value for same month previous year
    const getSameMonthPreviousYear = (field: keyof typeof currentMonthData) => {
      const prevYearData = allData.find(d => d.year === currentYear - 1 && d.monthIndex === currentMonth);
      return prevYearData?.[field] ?? null;
    };

    // Helper function to get current and previous year values for selected month
    const getSelectedMonthValues = (field: keyof typeof currentMonthData) => {
      const currentValue = currentMonthData[field] as number | null;
      const previousValue = getSameMonthPreviousYear(field) as number | null;
      return { currentValue, previousValue };
    };


    // Helper function to get YTD values
    const getYTDValues = (field: keyof typeof currentMonthData) => {
      const currentYTD = allData
        .filter(d => d.year === currentYear && d.monthIndex <= currentMonth)
        .reduce((sum, d) => sum + (d[field] as number ?? 0), 0);
      
      const previousYTD = allData
        .filter(d => d.year === currentYear - 1 && d.monthIndex <= currentMonth)
        .reduce((sum, d) => sum + (d[field] as number ?? 0), 0);
      
      return { currentYTD, previousYTD };
    };

    // Helper function to get YTD values with averages for saldo/crediti/debiti
    const getYTDAverageValues = (field: keyof typeof currentMonthData) => {
      const ytdData = getYTDValues(field);
      const currentAvg = ytdData.currentYTD / (currentMonth + 1);
      const previousAvg = ytdData.previousYTD / (currentMonth + 1);
      return { currentValue: currentAvg, previousValue: previousAvg };
    };

    // Helper function to get 12 months values with averages for saldo/crediti/debiti
    const get12MonthsAverageValues = (field: keyof typeof currentMonthData) => {
      const months12Data = getLast12MonthsValues(field);
      const currentAvg = months12Data.last12Months / 12;
      const previousAvg = months12Data.previous12Months / 12;
      return { currentValue: currentAvg, previousValue: previousAvg };
    };

    // Helper function to get last 12 months values
    const getLast12MonthsValues = (field: keyof typeof currentMonthData) => {
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
    const fatturatoValues = getSelectedMonthValues('fatturatoTotale');
    
    indicators.push({
      label: 'FATTURATO',
      lastMonthValues: fatturatoValues,
      lastMonth: fatturatoLastMonth ? calculatePercentageChange(currentMonthData.fatturatoTotale ?? 0, fatturatoLastMonth as number) : null,
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
    const incassatoValues = getSelectedMonthValues('incassato');
    
    indicators.push({
      label: 'INCASSATO',
      lastMonthValues: incassatoValues,
      lastMonth: incassatoLastMonth ? calculatePercentageChange(currentMonthData.incassato ?? 0, incassatoLastMonth as number) : null,
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
    
    
    const saldoCCValues = getSelectedMonthValues('saldoTotale');
    
    const saldoCCYTDValues = getYTDAverageValues('saldoTotale');
    const saldoCC12MonthsValues = get12MonthsAverageValues('saldoTotale');
    
    indicators.push({
      label: 'SALDO CC',
      lastMonthValues: saldoCCValues,
      lastMonth: saldoCCLastMonth ? calculatePercentageChange(currentMonthData.saldoTotale ?? 0, saldoCCLastMonth as number) : null,
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
    
    
    const creditiPendentiValues = getSelectedMonthValues('creditiPendenti');
    
    const creditiPendentiYTDValues = getYTDAverageValues('creditiPendenti');
    const creditiPendenti12MonthsValues = get12MonthsAverageValues('creditiPendenti');
    
    indicators.push({
      label: 'CREDITI PENDENTI',
      lastMonthValues: creditiPendentiValues,
      lastMonth: creditiPendentiLastMonth ? calculatePercentageChange(currentMonthData.creditiPendenti ?? 0, creditiPendentiLastMonth as number) : null,
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
    
    
    const creditiScadutiValues = getSelectedMonthValues('creditiScaduti');
    
    const creditiScadutiYTDValues = getYTDAverageValues('creditiScaduti');
    const creditiScaduti12MonthsValues = get12MonthsAverageValues('creditiScaduti');
    
    indicators.push({
      label: 'CREDITI SCADUTI',
      lastMonthValues: creditiScadutiValues,
      lastMonth: creditiScadutiLastMonth ? calculatePercentageChange(currentMonthData.creditiScaduti ?? 0, creditiScadutiLastMonth as number) : null,
      ytdValues: creditiScadutiYTDValues,
      ytd: creditiScadutiYTDPreviousAvg ? calculatePercentageChange(creditiScadutiYTDCurrentAvg, creditiScadutiYTDPreviousAvg) : null,
      last12MonthsValues: creditiScaduti12MonthsValues,
      last12Months: creditiScaduti12MonthsPreviousAvg ? calculatePercentageChange(creditiScaduti12MonthsCurrentAvg, creditiScaduti12MonthsPreviousAvg) : null,
      unit: '%',
    });

    // DEBITI FORNITORI
    const debitiFornitoriLastMonth = getSameMonthPreviousYear('debitiFornitore');
    const debitiFornitoriYTD = getYTDValues('debitiFornitore');
    const debitiFornitori12Months = getLast12MonthsValues('debitiFornitore');
    
    const debitiFornitoriYTDCurrentAvg = debitiFornitoriYTD.currentYTD / (currentMonth + 1);
    const debitiFornitoriYTDPreviousAvg = debitiFornitoriYTD.previousYTD / (currentMonth + 1);
    const debitiFornitori12MonthsCurrentAvg = debitiFornitori12Months.last12Months / 12;
    const debitiFornitori12MonthsPreviousAvg = debitiFornitori12Months.previous12Months / 12;
    
    
    const debitiFornitoriValues = getSelectedMonthValues('debitiFornitore');
    
    const debitiFornitoriYTDValues = getYTDAverageValues('debitiFornitore');
    const debitiFornitori12MonthsValues = get12MonthsAverageValues('debitiFornitore');
    
    indicators.push({
      label: 'DEBITI FORNITORI',
      lastMonthValues: debitiFornitoriValues,
      lastMonth: debitiFornitoriLastMonth ? calculatePercentageChange(currentMonthData.debitiFornitore ?? 0, debitiFornitoriLastMonth as number) : null,
      ytdValues: debitiFornitoriYTDValues,
      ytd: debitiFornitoriYTDPreviousAvg ? calculatePercentageChange(debitiFornitoriYTDCurrentAvg, debitiFornitoriYTDPreviousAvg) : null,
      last12MonthsValues: debitiFornitori12MonthsValues,
      last12Months: debitiFornitori12MonthsPreviousAvg ? calculatePercentageChange(debitiFornitori12MonthsCurrentAvg, debitiFornitori12MonthsPreviousAvg) : null,
      unit: '%',
    });

    // DEBITI BANCARI
    const debitiBancariLastMonth = getSameMonthPreviousYear('debitiBancari');
    const debitiBancariYTD = getYTDValues('debitiBancari');
    const debitiBancari12Months = getLast12MonthsValues('debitiBancari');
    
    const debitiBancariYTDCurrentAvg = debitiBancariYTD.currentYTD / (currentMonth + 1);
    const debitiBancariYTDPreviousAvg = debitiBancariYTD.previousYTD / (currentMonth + 1);
    const debitiBancari12MonthsCurrentAvg = debitiBancari12Months.last12Months / 12;
    const debitiBancari12MonthsPreviousAvg = debitiBancari12Months.previous12Months / 12;
    
    
    const debitiBancariValues = getSelectedMonthValues('debitiBancari');
    
    const debitiBancariYTDValues = getYTDAverageValues('debitiBancari');
    const debitiBancari12MonthsValues = get12MonthsAverageValues('debitiBancari');
    
    indicators.push({
      label: 'DEBITI BANCARI',
      lastMonthValues: debitiBancariValues,
      lastMonth: debitiBancariLastMonth ? calculatePercentageChange(currentMonthData.debitiBancari ?? 0, debitiBancariLastMonth as number) : null,
      ytdValues: debitiBancariYTDValues,
      ytd: debitiBancariYTDPreviousAvg ? calculatePercentageChange(debitiBancariYTDCurrentAvg, debitiBancariYTDPreviousAvg) : null,
      last12MonthsValues: debitiBancari12MonthsValues,
      last12Months: debitiBancari12MonthsPreviousAvg ? calculatePercentageChange(debitiBancari12MonthsCurrentAvg, debitiBancari12MonthsPreviousAvg) : null,
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
    const incidenzaCostiFissiLastMonthCurrent = currentMonthData.incassato ? (currentMonthData.costiFissi / currentMonthData.incassato) * 100 : null;
    const incidenzaCostiFissiLastMonthPrevious = (() => {
      const prevYearData = allData.find(d => d.year === currentYear - 1 && d.monthIndex === currentMonth);
      return prevYearData && prevYearData.incassato ? (prevYearData.costiFissi / prevYearData.incassato) * 100 : null;
    })();
    
    const incidenzaCostiFissiYTDCurrent = incassatoYTD.currentYTD ? (costiFissiYTD.currentYTD / incassatoYTD.currentYTD) * 100 : null;
    const incidenzaCostiFissiYTDPrevious = incassatoYTD.previousYTD ? (costiFissiYTD.previousYTD / incassatoYTD.previousYTD) * 100 : null;
    
    const incidenzaCostiFissi12MonthsCurrent = incassato12Months.last12Months ? (costiFissi12Months.last12Months / incassato12Months.last12Months) * 100 : null;
    const incidenzaCostiFissi12MonthsPrevious = incassato12Months.previous12Months ? (costiFissi12Months.previous12Months / incassato12Months.previous12Months) * 100 : null;
    
    indicators.push({
      label: 'INCIDENZA COSTI FISSI',
      lastMonthValues: { currentValue: incidenzaCostiFissiLastMonthCurrent, previousValue: incidenzaCostiFissiLastMonthPrevious },
      lastMonth: incidenzaCostiFissiLastMonthPrevious ? calculatePercentageChange(incidenzaCostiFissiLastMonthCurrent ?? 0, incidenzaCostiFissiLastMonthPrevious) : null,
      ytdValues: { currentValue: incidenzaCostiFissiYTDCurrent, previousValue: incidenzaCostiFissiYTDPrevious },
      ytd: incidenzaCostiFissiYTDPrevious ? calculatePercentageChange(incidenzaCostiFissiYTDCurrent ?? 0, incidenzaCostiFissiYTDPrevious) : null,
      last12MonthsValues: { currentValue: incidenzaCostiFissi12MonthsCurrent, previousValue: incidenzaCostiFissi12MonthsPrevious },
      last12Months: incidenzaCostiFissi12MonthsPrevious ? calculatePercentageChange(incidenzaCostiFissi12MonthsCurrent ?? 0, incidenzaCostiFissi12MonthsPrevious) : null,
      unit: '%',
    });

    // INCIDENZA COSTI VARIABILI
    const incidenzaCostiVariabiliLastMonthCurrent = currentMonthData.incassato ? (currentMonthData.costiVariabili / currentMonthData.incassato) * 100 : null;
    const incidenzaCostiVariabiliLastMonthPrevious = (() => {
      const prevYearData = allData.find(d => d.year === currentYear - 1 && d.monthIndex === currentMonth);
      return prevYearData && prevYearData.incassato ? (prevYearData.costiVariabili / prevYearData.incassato) * 100 : null;
    })();
    
    const incidenzaCostiVariabiliYTDCurrent = incassatoYTD.currentYTD ? (costiVariabiliYTD.currentYTD / incassatoYTD.currentYTD) * 100 : null;
    const incidenzaCostiVariabiliYTDPrevious = incassatoYTD.previousYTD ? (costiVariabiliYTD.previousYTD / incassatoYTD.previousYTD) * 100 : null;
    
    const incidenzaCostiVariabili12MonthsCurrent = incassato12Months.last12Months ? (costiVariabili12Months.last12Months / incassato12Months.last12Months) * 100 : null;
    const incidenzaCostiVariabili12MonthsPrevious = incassato12Months.previous12Months ? (costiVariabili12Months.previous12Months / incassato12Months.previous12Months) * 100 : null;
    
    indicators.push({
      label: 'INCIDENZA COSTI VARIABILI',
      lastMonthValues: { currentValue: incidenzaCostiVariabiliLastMonthCurrent, previousValue: incidenzaCostiVariabiliLastMonthPrevious },
      lastMonth: incidenzaCostiVariabiliLastMonthPrevious ? calculatePercentageChange(incidenzaCostiVariabiliLastMonthCurrent ?? 0, incidenzaCostiVariabiliLastMonthPrevious) : null,
      ytdValues: { currentValue: incidenzaCostiVariabiliYTDCurrent, previousValue: incidenzaCostiVariabiliYTDPrevious },
      ytd: incidenzaCostiVariabiliYTDPrevious ? calculatePercentageChange(incidenzaCostiVariabiliYTDCurrent ?? 0, incidenzaCostiVariabiliYTDPrevious) : null,
      last12MonthsValues: { currentValue: incidenzaCostiVariabili12MonthsCurrent, previousValue: incidenzaCostiVariabili12MonthsPrevious },
      last12Months: incidenzaCostiVariabili12MonthsPrevious ? calculatePercentageChange(incidenzaCostiVariabili12MonthsCurrent ?? 0, incidenzaCostiVariabili12MonthsPrevious) : null,
      unit: '%',
    });

    // INCIDENZA UTILE
    const incidenzaUtileLastMonthCurrent = currentMonthData.incassato ? (currentMonthData.utile / currentMonthData.incassato) * 100 : null;
    const incidenzaUtileLastMonthPrevious = (() => {
      const prevYearData = allData.find(d => d.year === currentYear - 1 && d.monthIndex === currentMonth);
      return prevYearData && prevYearData.incassato ? (prevYearData.utile / prevYearData.incassato) * 100 : null;
    })();
    
    const incidenzaUtileYTDCurrent = incassatoYTD.currentYTD ? (utileYTD.currentYTD / incassatoYTD.currentYTD) * 100 : null;
    const incidenzaUtileYTDPrevious = incassatoYTD.previousYTD ? (utileYTD.previousYTD / incassatoYTD.previousYTD) * 100 : null;
    
    const incidenzaUtile12MonthsCurrent = incassato12Months.last12Months ? (utile12Months.last12Months / incassato12Months.last12Months) * 100 : null;
    const incidenzaUtile12MonthsPrevious = incassato12Months.previous12Months ? (utile12Months.previous12Months / incassato12Months.previous12Months) * 100 : null;
    
    indicators.push({
      label: 'INCIDENZA UTILE',
      lastMonthValues: { currentValue: incidenzaUtileLastMonthCurrent, previousValue: incidenzaUtileLastMonthPrevious },
      lastMonth: incidenzaUtileLastMonthPrevious ? calculatePercentageChange(incidenzaUtileLastMonthCurrent ?? 0, incidenzaUtileLastMonthPrevious) : null,
      ytdValues: { currentValue: incidenzaUtileYTDCurrent, previousValue: incidenzaUtileYTDPrevious },
      ytd: incidenzaUtileYTDPrevious ? calculatePercentageChange(incidenzaUtileYTDCurrent ?? 0, incidenzaUtileYTDPrevious) : null,
      last12MonthsValues: { currentValue: incidenzaUtile12MonthsCurrent, previousValue: incidenzaUtile12MonthsPrevious },
      last12Months: incidenzaUtile12MonthsPrevious ? calculatePercentageChange(incidenzaUtile12MonthsCurrent ?? 0, incidenzaUtile12MonthsPrevious) : null,
      unit: '%',
    });

    // PREVISIONALE / CONSUNTIVO comparison - always show all fields
    const previsionaleConsuntivo = [
      {
        label: 'INCASSATO',
        consuntivo: currentMonthData.incassato,
        previsionale: getIncassatoTotal(causaliCatalog, planYear, getPlanPreventivoValue, currentMonthData.year, currentMonthData.monthIndex),
      },
      {
        label: 'COSTI FISSI',
        consuntivo: currentMonthData.costiFissi,
        previsionale: getCostiFissiTotal(causaliCatalog, planYear, getPlanPreventivoValue, currentMonthData.year, currentMonthData.monthIndex),
      },
      {
        label: 'COSTI VARIABILI',
        consuntivo: currentMonthData.costiVariabili,
        previsionale: getCostiVariabiliTotal(causaliCatalog, planYear, getPlanPreventivoValue, currentMonthData.year, currentMonthData.monthIndex),
      },
      {
        label: 'UTILE',
        consuntivo: currentMonthData.utile,
        previsionale: calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanPreventivoValue, currentMonthData.year, currentMonthData.monthIndex),
      },
    ];

    // Generate available months for selector
    const availableMonths = allData
      .filter(d => d.incassato !== null && d.incassato !== 0)
      .map(d => ({
        year: d.year,
        monthIndex: d.monthIndex,
        label: format(new Date(d.year, d.monthIndex, 1), 'MMMM yyyy', { locale: it }),
        value: `${d.year}-${d.monthIndex}`
      }))
      .sort((a, b) => b.year - a.year || b.monthIndex - a.monthIndex);

    return {
      indicators,
      previsionaleConsuntivo,
      lastCompiledMonth: format(new Date(lastCompiledMonth.year, lastCompiledMonth.monthIndex, 1), 'MMMM yyyy', { locale: it }),
      currentMonth: format(new Date(currentMonthData.year, currentMonthData.monthIndex, 1), 'MMMM yyyy', { locale: it }),
      currentYear,
      currentMonth: currentMonthData.monthIndex,
      availableMonths,
    };
  }, [availableYears, statsOverrides, financialStatsRows, getPlanPreventivoValue, getPlanConsuntivoValue, causaliCatalog, planYear, selectedMonth]);

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

  // Handler for month selection
  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === '') {
      setSelectedMonth(null);
    } else {
      const [year, monthIndex] = value.split('-').map(Number);
      setSelectedMonth({ year, monthIndex });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Analisi FP
            </h2>
            <p className="text-gray-600">
              Mese selezionato: <span className="font-semibold text-blue-600">{analysisData.currentMonth}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              Seleziona mese:
            </label>
            <select
              value={selectedMonth ? `${selectedMonth.year}-${selectedMonth.monthIndex}` : ''}
              onChange={handleMonthChange}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
            >
              <option value="">Ultimo mese compilato</option>
              {analysisData.availableMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {analysisData.indicators.length > 0 ? (
          analysisData.indicators.map((indicator) => {
            const isIncidenza = indicator.label.includes('INCIDENZA');
            const formatFunc = isIncidenza ? formatIncidenzaPercentage : formatPercentage;
            
            return (
              <div key={indicator.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                {/* Header */}
                <div className="flex items-center justify-center mb-4">
                  <h3 className="text-base font-semibold text-gray-900 text-center">{indicator.label}</h3>
                </div>

                {/* Time Periods */}
                <div className="space-y-4">
                  {/* Ultimo Mese */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-sm font-medium text-blue-800 uppercase tracking-wide">Ultimo Mese</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700">
                            2025: <span className="font-semibold">{indicator.lastMonthValues.currentValue !== null ? (isIncidenza ? formatIncidenzaPercentage(indicator.lastMonthValues.currentValue) : formatCurrency(indicator.lastMonthValues.currentValue)) : '-'}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            2024: <span className="font-medium">{indicator.lastMonthValues.previousValue !== null ? (isIncidenza ? formatIncidenzaPercentage(indicator.lastMonthValues.previousValue) : formatCurrency(indicator.lastMonthValues.previousValue)) : '-'}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-2 rounded-full text-lg font-bold ${getChangeColor(indicator.lastMonth)} flex items-center justify-center min-w-[60px]`}>
                        {formatFunc(indicator.lastMonth)}
                      </div>
                    </div>
                  </div>

                  {/* YTD */}
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-200">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-sm font-medium text-emerald-800 uppercase tracking-wide">YTD</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700">
                            2025: <span className="font-semibold">{indicator.ytdValues.currentValue !== null ? (isIncidenza ? formatIncidenzaPercentage(indicator.ytdValues.currentValue) : formatCurrency(indicator.ytdValues.currentValue)) : '-'}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            2024: <span className="font-medium">{indicator.ytdValues.previousValue !== null ? (isIncidenza ? formatIncidenzaPercentage(indicator.ytdValues.previousValue) : formatCurrency(indicator.ytdValues.previousValue)) : '-'}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-2 rounded-full text-lg font-bold ${getChangeColor(indicator.ytd)} flex items-center justify-center min-w-[60px]`}>
                        {formatFunc(indicator.ytd)}
                      </div>
                    </div>
                  </div>

                  {/* 12 Mesi */}
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-sm font-medium text-purple-800 uppercase tracking-wide">12 Mesi</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700">
                            {analysisData.currentYear}: <span className="font-semibold">{indicator.last12MonthsValues.currentValue !== null ? (isIncidenza ? formatIncidenzaPercentage(indicator.last12MonthsValues.currentValue) : formatCurrency(indicator.last12MonthsValues.currentValue)) : '-'}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {analysisData.currentYear - 1}: <span className="font-medium">{indicator.last12MonthsValues.previousValue !== null ? (isIncidenza ? formatIncidenzaPercentage(indicator.last12MonthsValues.previousValue) : formatCurrency(indicator.last12MonthsValues.previousValue)) : '-'}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-2 rounded-full text-lg font-bold ${getChangeColor(indicator.last12Months)} flex items-center justify-center min-w-[60px]`}>
                        {formatFunc(indicator.last12Months)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          // Show all indicators even if no data
          [
            'FATTURATO', 'INCASSATO', 'SALDO CC', 'CREDITI PENDENTI', 
            'CREDITI SCADUTI', 'DEBITI FORNITORI', 'DEBITI BANCARI',
            'INCIDENZA COSTI FISSI', 'INCIDENZA COSTI VARIABILI', 'INCIDENZA UTILE'
          ].map((label) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-center mb-4">
                <h3 className="text-base font-semibold text-gray-900 text-center">{label}</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">Ultimo Mese</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-500">2025: -</div>
                        <div className="text-sm text-gray-500">2024: -</div>
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-full text-lg font-bold text-gray-500 flex items-center justify-center min-w-[60px]">-</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-center mb-2">
                      <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">YTD</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-500">2025: -</div>
                        <div className="text-sm text-gray-500">2024: -</div>
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-full text-lg font-bold text-gray-500 flex items-center justify-center min-w-[60px]">-</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-center mb-2">
                      <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">12 Mesi</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-500">2025: -</div>
                        <div className="text-sm text-gray-500">2024: -</div>
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-full text-lg font-bold text-gray-500 flex items-center justify-center min-w-[60px]">-</div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Previsionale / Consuntivo Section */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Previsionale / Consuntivo
            </h3>
            <p className="text-gray-600">
              Mese selezionato: <span className="font-semibold text-orange-600">{analysisData.currentMonth}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              Seleziona mese:
            </label>
            <select
              value={selectedMonth ? `${selectedMonth.year}-${selectedMonth.monthIndex}` : ''}
              onChange={handleMonthChange}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white shadow-sm"
            >
              <option value="">Ultimo mese compilato</option>
              {analysisData.availableMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analysisData.previsionaleConsuntivo.length > 0 ? (
            analysisData.previsionaleConsuntivo.map((item) => {
              const variazione = item.consuntivo && item.previsionale 
                ? ((item.consuntivo - item.previsionale) / item.previsionale) * 100 
                : null;
              
              return (
                <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                  {/* Header */}
                  <div className="flex items-center justify-center mb-4">
                    <h4 className="text-base font-semibold text-gray-900 text-center">{item.label}</h4>
                  </div>

                  {/* Month */}
                  <div className="mb-3 text-center">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Mese</span>
                    <p className="text-base text-gray-600 mt-1">{analysisData.lastCompiledMonth}</p>
                  </div>

                  {/* Values */}
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 text-center">
                      <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">Consuntivo</span>
                      <p className="text-base font-semibold text-gray-800 mt-1">{formatCurrency(item.consuntivo)}</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200 text-center">
                      <span className="text-sm font-medium text-blue-700 uppercase tracking-wide">Previsionale</span>
                      <p className="text-base font-semibold text-blue-800 mt-1">{formatCurrency(item.previsionale)}</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-200 text-center">
                      <span className="text-sm font-medium text-emerald-700 uppercase tracking-wide">Variazione</span>
                      <p className={`text-base font-semibold mt-1 ${getChangeColor(variazione)}`}>
                        {formatPercentage(variazione)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // Show all fields even if no data
            ['INCASSATO', 'COSTI FISSI', 'COSTI VARIABILI', 'UTILE'].map((label) => (
              <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-center mb-4">
                  <h4 className="text-base font-semibold text-gray-900 text-center">{label}</h4>
                </div>

                <div className="mb-3 text-center">
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Mese</span>
                  <p className="text-base text-gray-500 mt-1">-</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Consuntivo</span>
                    <p className="text-base font-semibold text-gray-500 mt-1">-</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Previsionale</span>
                    <p className="text-base font-semibold text-gray-500 mt-1">-</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Variazione</span>
                    <p className="text-base font-semibold text-gray-500 mt-1">-</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
