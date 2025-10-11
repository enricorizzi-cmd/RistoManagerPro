// Financial Overview Component
// Displays overview metrics and charts

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { formatCurrencyValue, MONTH_SHORT, parsePlanMonthLabel, buildMonthKey } from '../../utils/financialPlanUtils';
import { calculateUtileFromMacroTotals, getIncassatoTotal, getCostiFissiTotal, getCostiVariabiliTotal } from '../../utils/financialCalculations';
import type { PlanYearData } from '../../utils/financialCalculations';
import type { FinancialStatsRow, FinancialCausaleGroup } from '../../data/financialPlanData';

interface FinancialOverviewProps {
  planYear: PlanYearData | undefined;
  selectedYear: number;
  availableYears: number[];
  onYearChange: (selectedYear: number) => void;
  financialStatsRows: FinancialStatsRow[];
  causaliCatalog: FinancialCausaleGroup[];
  getPlanConsuntivoValue: (..._args: any[]) => number;
  statsOverrides?: any;
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({ 
  planYear, 
  selectedYear,
  availableYears,
  onYearChange,
  financialStatsRows,
  causaliCatalog,
  getPlanConsuntivoValue,
  statsOverrides = {}
}) => {
  // Check if current year is the actual current year for YTD calculation
  const currentActualYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentActualYear;

  // Helper function to calculate percentage increment
  const calculateIncrement = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / previous) * 100;
  };

  const overviewTotals = useMemo(() => {
    // Helper function to calculate totals for a specific year
    const calculateYearTotals = (year: number, maxMonths: number = 12) => {
    if (!planYear) {
      return {
          fatturato: 0,
        incassato: 0,
        costiFissi: 0,
        costiVariabili: 0,
        utile: 0,
      };
    }
    
    // Estrai dati dal piano mensile usando le funzioni di calcolo
    const incassato = Array.from({ length: maxMonths }, (_, monthIndex) => monthIndex).reduce((acc, monthIndex) => 
      acc + getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex), 0
    );
    
    const costiFissi = Array.from({ length: maxMonths }, (_, monthIndex) => monthIndex).reduce((acc, monthIndex) => 
      acc + getCostiFissiTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex), 0
    );
    
    const costiVariabili = Array.from({ length: maxMonths }, (_, monthIndex) => monthIndex).reduce((acc, monthIndex) => 
      acc + getCostiVariabiliTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex), 0
    );
    
    const utile = Array.from({ length: maxMonths }, (_, monthIndex) => monthIndex).reduce((acc, monthIndex) => 
      acc + calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex), 0
    );
    
    // Calcola il fatturato dalle statistiche (stessa logica del grafico 48 mesi)
    const fatturato = Array.from({ length: maxMonths }, (_, monthIndex) => monthIndex).reduce((acc, monthIndex) => {
        const monthKey = buildMonthKey(year, monthIndex);
      
      // Helper function to get field value with overrides (same as grafico 48 mesi)
      const getFieldValue = (field: string) => {
        const overrideKey = `${monthKey}|${field}`;
        const overrideValue = statsOverrides[overrideKey];
        
        // If we have an override, use it
        if (overrideValue !== undefined) {
          return overrideValue;
        }
        
        // Find stats data using parsePlanMonthLabel logic
        const statsRow = financialStatsRows.find(row => {
          const parsed = parsePlanMonthLabel(row.month);
          if (parsed) {
              const { year: rowYear, monthIndex: rowMonthIndex } = parsed;
              return rowYear === year && rowMonthIndex === monthIndex;
          }
          return false;
        });
        
        // If we have statsData, use it
        if (statsRow) {
          return statsRow[field as keyof FinancialStatsRow];
        }
        
        // No data available
        return null;
      };
      
      // Usa fatturatoImponibile come nel grafico 48 mesi
      const fatturatoValue = getFieldValue('fatturatoImponibile') ?? 0;
      
      return acc + (fatturatoValue || 0);
    }, 0);
    
    return {
        fatturato,
      incassato,
      costiFissi,
      costiVariabili,
      utile,
      };
    };

    // Calculate totals for current year and previous years
    const currentYearTotals = calculateYearTotals(selectedYear);
    const prevYear1Totals = calculateYearTotals(selectedYear - 1);
    const prevYear2Totals = calculateYearTotals(selectedYear - 2);
    const prevYear3Totals = calculateYearTotals(selectedYear - 3);


    const currentMonth = new Date().getMonth(); // 0-based month index

    // Calculate YTD values for current year (if applicable)
    let currentYearYTDTotals = null;
    let prevYearYTDTotals = null;
    
    if (isCurrentYear) {
      // currentMonth is 0-based (0 = January, 11 = December)
      // For YTD, we calculate up to the previous month (currentMonth - 1)
      // This ensures we compare completed months only
      const monthsToInclude = Math.max(0, currentMonth); // Don't include current month
      currentYearYTDTotals = calculateYearTotals(selectedYear, monthsToInclude);
      prevYearYTDTotals = calculateYearTotals(selectedYear - 1, monthsToInclude);
    }

    // Calculate increments - use YTD for current year, full year for others
    let fatturatoIncrement, incassatoIncrement, costiFissiIncrement, costiVariabiliIncrement, utileIncrement;

    if (isCurrentYear) {
      // For current year, calculate YTD vs previous year YTD
      // Don't show increment if previous year is zero (first year with data)
      fatturatoIncrement = prevYearYTDTotals.fatturato === 0 ? null : calculateIncrement(currentYearYTDTotals.fatturato, prevYearYTDTotals.fatturato);
      incassatoIncrement = prevYearYTDTotals.incassato === 0 ? null : calculateIncrement(currentYearYTDTotals.incassato, prevYearYTDTotals.incassato);
      costiFissiIncrement = prevYearYTDTotals.costiFissi === 0 ? null : calculateIncrement(currentYearYTDTotals.costiFissi, prevYearYTDTotals.costiFissi);
      costiVariabiliIncrement = prevYearYTDTotals.costiVariabili === 0 ? null : calculateIncrement(currentYearYTDTotals.costiVariabili, prevYearYTDTotals.costiVariabili);
      utileIncrement = prevYearYTDTotals.utile === 0 ? null : calculateIncrement(currentYearYTDTotals.utile, prevYearYTDTotals.utile);
    } else {
      // For other years, use full year comparison
      // Don't show increment if previous year is zero (first year with data)
      fatturatoIncrement = prevYear1Totals.fatturato === 0 ? null : calculateIncrement(currentYearTotals.fatturato, prevYear1Totals.fatturato);
      incassatoIncrement = prevYear1Totals.incassato === 0 ? null : calculateIncrement(currentYearTotals.incassato, prevYear1Totals.incassato);
      costiFissiIncrement = prevYear1Totals.costiFissi === 0 ? null : calculateIncrement(currentYearTotals.costiFissi, prevYear1Totals.costiFissi);
      costiVariabiliIncrement = prevYear1Totals.costiVariabili === 0 ? null : calculateIncrement(currentYearTotals.costiVariabili, prevYear1Totals.costiVariabili);
      utileIncrement = prevYear1Totals.utile === 0 ? null : calculateIncrement(currentYearTotals.utile, prevYear1Totals.utile);
    }

    return {
      currentYear: currentYearTotals,
      prevYear1: prevYear1Totals,
      prevYear2: prevYear2Totals,
      prevYear3: prevYear3Totals,
      increments: {
        fatturato: fatturatoIncrement,
        incassato: incassatoIncrement,
        costiFissi: costiFissiIncrement,
        costiVariabili: costiVariabiliIncrement,
        utile: utileIncrement,
      },
      // YTD values for current year (if applicable)
      currentYearYTDTotals: isCurrentYear ? currentYearYTDTotals : null,
      prevYearYTDTotals: isCurrentYear ? prevYearYTDTotals : null,
      // Keep legacy properties for backward compatibility
      fatturato: currentYearTotals.fatturato,
      incassato: currentYearTotals.incassato,
      costiFissi: currentYearTotals.costiFissi,
      costiVariabili: currentYearTotals.costiVariabili,
      utile: currentYearTotals.utile,
    };
  }, [planYear, causaliCatalog, getPlanConsuntivoValue, selectedYear, statsOverrides, financialStatsRows, isCurrentYear]);

  const overviewChartData = useMemo(() => {
    if (!planYear) {
      return [];
    }
    
    // Estrai dati mensili dal piano mensile usando le funzioni di calcolo
    const incassato = MONTH_SHORT.map((_, monthIndex) => 
      getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex)
    );
    
    const costiFissi = MONTH_SHORT.map((_, monthIndex) => 
      getCostiFissiTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex)
    );
    
    const costiVariabili = MONTH_SHORT.map((_, monthIndex) => 
      getCostiVariabiliTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex)
    );

    // Calcola il fatturato mensile dalle statistiche (stessa logica del grafico 48 mesi)
    const fatturato = MONTH_SHORT.map((_, monthIndex) => {
      const monthKey = buildMonthKey(selectedYear, monthIndex);
      
      // Helper function to get field value with overrides (same as grafico 48 mesi)
      const getFieldValue = (field: string) => {
        const overrideKey = `${monthKey}|${field}`;
        const overrideValue = statsOverrides[overrideKey];
        
        // If we have an override, use it
        if (overrideValue !== undefined) {
          return overrideValue;
        }
        
        // Find stats data using parsePlanMonthLabel logic
        const statsRow = financialStatsRows.find(row => {
          const parsed = parsePlanMonthLabel(row.month);
          if (parsed) {
            const { year, monthIndex: rowMonthIndex } = parsed;
            return year === selectedYear && rowMonthIndex === monthIndex;
          }
          return false;
        });
        
        // If we have statsData, use it
        if (statsRow) {
          return statsRow[field as keyof FinancialStatsRow];
        }
        
        // No data available
        return null;
      };
      
      // Usa fatturatoImponibile come nel grafico 48 mesi
      return getFieldValue('fatturatoImponibile') ?? 0;
    });

    // Calcolo del breakeven point
    const currentYear = new Date().getFullYear();
    const isCurrentYear = selectedYear === currentYear;
    const currentMonth = new Date().getMonth(); // 0-11
    
    // Per l'anno corrente: somma costi fissi + variabili / numero di mesi da gennaio al mese precedente
    // Per gli anni passati: somma costi fissi + variabili / 12 mesi
    const totalCostiFissi = costiFissi.reduce((acc, value) => acc + value, 0);
    const totalCostiVariabili = costiVariabili.reduce((acc, value) => acc + value, 0);
    const totalCosti = totalCostiFissi + totalCostiVariabili;
    
    const monthsToConsider = isCurrentYear ? Math.max(1, currentMonth) : 12;
    const breakevenPoint = totalCosti / monthsToConsider;

    return MONTH_SHORT.map((label, index) => ({
      month: `${label} ${String(selectedYear).slice(-2)}`,
      fatturato: fatturato[index] ?? 0,
      incassato: incassato[index] ?? 0,
      costiFissi: costiFissi[index] ?? 0,
      costiVariabili: costiVariabili[index] ?? 0,
      utile: calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, index),
      breakevenPoint: breakevenPoint,
    }));
  }, [planYear, selectedYear, causaliCatalog, getPlanConsuntivoValue, statsOverrides, financialStatsRows]);


  // Calcolo dati grafico fatturato 48 mesi
  const fatturatoChartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 3; // 3 anni fa
    const data: Array<{
      month: string;
      fatturatoReale: number | null;
      fatturatoPrevisionale: number | null;
    }> = [];

    // Creare mappa dei dati statistiche per accesso rapido
    const statsMap = new Map<string, FinancialStatsRow>();
    financialStatsRows.forEach((row) => {
      const parsed = parsePlanMonthLabel(row.month);
      if (parsed) {
        const { year, monthIndex } = parsed;
        const monthKey = buildMonthKey(year, monthIndex);
        statsMap.set(monthKey, row);
      }
    });

    // Generare 48 mesi (gennaio 3 anni fa - dicembre anno corrente)
    for (let year = startYear; year <= currentYear; year++) {
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const monthKey = buildMonthKey(year, monthIndex);
        const statsData = statsMap.get(monthKey);
        
        const monthLabel = `${MONTH_SHORT[monthIndex]} ${String(year).slice(-2)}`;
        
        // Helper function to get field value with overrides (same as StatsTable)
        const getFieldValue = (field: string) => {
          const overrideKey = `${monthKey}|${field}`;
          const overrideValue = statsOverrides[overrideKey];
          
          // If we have an override, use it
          if (overrideValue !== undefined) {
            return overrideValue;
          }
          
          // If we have statsData, use it
          if (statsData) {
            return statsData[field as keyof FinancialStatsRow];
          }
          
          // No data available
          return null;
        };
        
        // Estrai dati reali dalle statistiche (con override)
        const fatturatoReale = getFieldValue('fatturatoImponibile');
        
        // Estrai dati previsionali dalle statistiche (con override)
        const fatturatoPrevisionale = getFieldValue('fatturatoPrevisionale');
        
        data.push({
          month: monthLabel,
          fatturatoReale,
          fatturatoPrevisionale,
        });
      }
    }

    return data;
  }, [financialStatsRows, statsOverrides]);


  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs font-semibold uppercase text-gray-500">
          Anno
        </label>
        <select
          value={selectedYear}
          onChange={(event) => onYearChange(Number(event.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        {/* Fatturato Card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm min-w-[300px]">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-3">
            Fatturato
          </p>
          <div className="space-y-2">
            {overviewTotals.prevYear3.fatturato > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 3}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear3.fatturato)}</span>
                  {(() => {
                    // Don't show increment for 2022 - it's the first year with data
                    return null;
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear2.fatturato > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 2}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear2.fatturato)}</span>
                  {(() => {
                    // Show increment of 2023 vs 2022
                    const increment = calculateIncrement(overviewTotals.prevYear2.fatturato, overviewTotals.prevYear3.fatturato);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear1.fatturato > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 1}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear1.fatturato)}</span>
                  {(() => {
                    // Show increment of 2024 vs 2023
                    const increment = calculateIncrement(overviewTotals.prevYear1.fatturato, overviewTotals.prevYear2.fatturato);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-semibold text-gray-800">{selectedYear}:</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-blue-700">
                  {formatCurrencyValue(isCurrentYear ? overviewTotals.currentYearYTDTotals?.fatturato || overviewTotals.currentYear.fatturato : overviewTotals.currentYear.fatturato)}
                </span>
                {overviewTotals.increments.fatturato !== null && isCurrentYear && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    overviewTotals.increments.fatturato >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {overviewTotals.increments.fatturato >= 0 ? '+' : ''}{overviewTotals.increments.fatturato.toFixed(1)}%
                    <span className="ml-1 text-xs opacity-75">YTD</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Incassato Card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm min-w-[300px]">
            <p className="text-xs font-semibold uppercase text-gray-500 mb-3">
              Incassato
            </p>
          <div className="space-y-2">
            {overviewTotals.prevYear3.incassato > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 3}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear3.incassato)}</span>
                  {(() => {
                    // Don't show increment if prevYear3 is the first year with data
                    // Check if the year before prevYear3 (prevYear2) has zero data
                    if (overviewTotals.prevYear2.incassato === 0) return null;
                    const increment = calculateIncrement(overviewTotals.prevYear3.incassato, overviewTotals.prevYear2.incassato);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear2.incassato > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 2}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear2.incassato)}</span>
                  {(() => {
                    // Don't show increment if prevYear1 is the first year with data
                    // Check if the year before prevYear1 (prevYear2) has zero data
                    if (overviewTotals.prevYear2.incassato === 0) return null;
                    const increment = calculateIncrement(overviewTotals.prevYear1.incassato, overviewTotals.prevYear2.incassato);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear1.incassato > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 1}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear1.incassato)}</span>
                  {(() => {
                    // Don't show annual increment for current year - only YTD is shown
                    return null;
                  })()}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-semibold text-gray-800">{selectedYear}:</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">{formatCurrencyValue(isCurrentYear ? overviewTotals.currentYearYTDTotals?.incassato || overviewTotals.currentYear.incassato : overviewTotals.currentYear.incassato)}</span>
                {overviewTotals.increments.incassato !== null && isCurrentYear && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    overviewTotals.increments.incassato >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {overviewTotals.increments.incassato >= 0 ? '+' : ''}{overviewTotals.increments.incassato.toFixed(1)}%
                    {isCurrentYear && <span className="ml-1 text-xs opacity-75">YTD</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Costi Fissi Card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm min-w-[300px]">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-3">
            Costi fissi
          </p>
          <div className="space-y-2">
            {overviewTotals.prevYear3.costiFissi > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 3}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear3.costiFissi)}</span>
                  {(() => {
                    // Don't show increment if prevYear3 is the first year with data
                    // Check if the year before prevYear3 (prevYear2) has zero data
                    if (overviewTotals.prevYear2.costiFissi === 0) return null;
                    const increment = calculateIncrement(overviewTotals.prevYear3.costiFissi, overviewTotals.prevYear2.costiFissi);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear2.costiFissi > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 2}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear2.costiFissi)}</span>
                  {(() => {
                    // Don't show increment if prevYear1 is the first year with data
                    // Check if the year before prevYear1 (prevYear2) has zero data
                    if (overviewTotals.prevYear2.costiFissi === 0) return null;
                    const increment = calculateIncrement(overviewTotals.prevYear1.costiFissi, overviewTotals.prevYear2.costiFissi);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear1.costiFissi > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 1}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear1.costiFissi)}</span>
                  {(() => {
                    // Don't show annual increment for current year - only YTD is shown
                    return null;
                  })()}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-semibold text-gray-800">{selectedYear}:</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">{formatCurrencyValue(isCurrentYear ? overviewTotals.currentYearYTDTotals?.costiFissi || overviewTotals.currentYear.costiFissi : overviewTotals.currentYear.costiFissi)}</span>
                {overviewTotals.increments.costiFissi !== null && isCurrentYear && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    overviewTotals.increments.costiFissi >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {overviewTotals.increments.costiFissi >= 0 ? '+' : ''}{overviewTotals.increments.costiFissi.toFixed(1)}%
                    {isCurrentYear && <span className="ml-1 text-xs opacity-75">YTD</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Costi Variabili Card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm min-w-[300px]">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-3">
            Costi variabili
          </p>
          <div className="space-y-2">
            {overviewTotals.prevYear3.costiVariabili > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 3}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear3.costiVariabili)}</span>
                  {(() => {
                    // Don't show increment if prevYear3 is the first year with data
                    // Check if the year before prevYear3 (prevYear2) has zero data
                    if (overviewTotals.prevYear2.costiVariabili === 0) return null;
                    const increment = calculateIncrement(overviewTotals.prevYear3.costiVariabili, overviewTotals.prevYear2.costiVariabili);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear2.costiVariabili > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 2}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear2.costiVariabili)}</span>
                  {(() => {
                    // Don't show increment if prevYear1 is the first year with data
                    // Check if the year before prevYear1 (prevYear2) has zero data
                    if (overviewTotals.prevYear2.costiVariabili === 0) return null;
                    const increment = calculateIncrement(overviewTotals.prevYear1.costiVariabili, overviewTotals.prevYear2.costiVariabili);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear1.costiVariabili > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 1}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear1.costiVariabili)}</span>
                  {(() => {
                    // Don't show annual increment for current year - only YTD is shown
                    return null;
                  })()}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-semibold text-gray-800">{selectedYear}:</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">{formatCurrencyValue(isCurrentYear ? overviewTotals.currentYearYTDTotals?.costiVariabili || overviewTotals.currentYear.costiVariabili : overviewTotals.currentYear.costiVariabili)}</span>
                {overviewTotals.increments.costiVariabili !== null && isCurrentYear && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    overviewTotals.increments.costiVariabili >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {overviewTotals.increments.costiVariabili >= 0 ? '+' : ''}{overviewTotals.increments.costiVariabili.toFixed(1)}%
                    {isCurrentYear && <span className="ml-1 text-xs opacity-75">YTD</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Utile Card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm min-w-[300px]">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-3">
            Utile
          </p>
          <div className="space-y-2">
            {overviewTotals.prevYear3.utile > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 3}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear3.utile)}</span>
                  {(() => {
                    // Don't show increment if prevYear3 is the first year with data
                    // Check if the year before prevYear3 (prevYear2) has zero data
                    if (overviewTotals.prevYear2.utile === 0) return null;
                    const increment = calculateIncrement(overviewTotals.prevYear3.utile, overviewTotals.prevYear2.utile);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear2.utile > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 2}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear2.utile)}</span>
                  {(() => {
                    // Don't show increment if prevYear1 is the first year with data
                    // Check if the year before prevYear1 (prevYear2) has zero data
                    if (overviewTotals.prevYear2.utile === 0) return null;
                    const increment = calculateIncrement(overviewTotals.prevYear1.utile, overviewTotals.prevYear2.utile);
                    return increment !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        increment >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {increment >= 0 ? '+' : ''}{increment.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {overviewTotals.prevYear1.utile > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedYear - 1}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrencyValue(overviewTotals.prevYear1.utile)}</span>
                  {(() => {
                    // Don't show annual increment for current year - only YTD is shown
                    return null;
                  })()}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-semibold text-gray-800">{selectedYear}:</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-emerald-700">{formatCurrencyValue(isCurrentYear ? overviewTotals.currentYearYTDTotals?.utile || overviewTotals.currentYear.utile : overviewTotals.currentYear.utile)}</span>
                {overviewTotals.increments.utile !== null && isCurrentYear && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    overviewTotals.increments.utile >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {overviewTotals.increments.utile >= 0 ? '+' : ''}{overviewTotals.increments.utile.toFixed(1)}%
                    {isCurrentYear && <span className="ml-1 text-xs opacity-75">YTD</span>}
                  </span>
                )}
              </div>
        </div>
        </div>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={overviewChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatCurrencyValue(value)} />
            <Line type="monotone" dataKey="fatturato" stroke="#1d4ed8" strokeWidth={3} />
            <Line type="monotone" dataKey="incassato" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="costiFissi" stroke="#f97316" strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="costiVariabili"
              stroke="#facc15"
              strokeWidth={2}
            />
            <Line type="monotone" dataKey="utile" stroke="#047857" strokeWidth={2} />
            <Line 
              type="monotone" 
              dataKey="breakevenPoint" 
              stroke="#dc2626" 
              strokeWidth={2} 
              strokeDasharray="5 5"
              name="Breakeven Point"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Istogramma utile mensile */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Utile Mensile {selectedYear}
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={overviewChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => formatCurrencyValue(value)}
              labelStyle={{ color: '#374151' }}
            />
            <Bar 
              dataKey="utile" 
              fill="#047857" 
              name="Utile Mensile"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Grafico fatturato 48 mesi */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Fatturato 48 Mesi (Gennaio 2022 - Dicembre 2025)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={fatturatoChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis domain={[0, 'dataMax + 10']} />
            <Tooltip 
              formatter={(value: number) => formatCurrencyValue(value)}
              labelStyle={{ color: '#374151' }}
            />
            <Line 
              type="monotone" 
              dataKey="fatturatoReale" 
              stroke="#2563eb" 
              strokeWidth={2}
              name="Fatturato Reale"
              dot={false}
              connectNulls={false}
            />
            <Line 
              type="monotone" 
              dataKey="fatturatoPrevisionale" 
              stroke="#2563eb" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Fatturato Previsionale"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
