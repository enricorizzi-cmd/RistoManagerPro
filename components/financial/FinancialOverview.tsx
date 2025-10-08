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
  getPlanConsuntivoValue: (macro: string, category: string, detail: string, selectedYear: number, monthIndex: number) => number;
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
  const overviewTotals = useMemo(() => {
    if (!planYear) {
      return {
        incassato: 0,
        costiFissi: 0,
        costiVariabili: 0,
        utile: 0,
      };
    }
    
    // Estrai dati dal piano mensile usando le funzioni di calcolo
    const incassato = MONTH_SHORT.reduce((acc, _, monthIndex) => 
      acc + getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex), 0
    );
    
    const costiFissi = MONTH_SHORT.reduce((acc, _, monthIndex) => 
      acc + getCostiFissiTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex), 0
    );
    
    const costiVariabili = MONTH_SHORT.reduce((acc, _, monthIndex) => 
      acc + getCostiVariabiliTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex), 0
    );
    
    const utile = MONTH_SHORT.reduce((acc, _, monthIndex) => 
      acc + calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex), 0
    );
    
    return {
      incassato,
      costiFissi,
      costiVariabili,
      utile,
    };
  }, [planYear, causaliCatalog, getPlanConsuntivoValue, selectedYear]);

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
      incassato: incassato[index] ?? 0,
      costiFissi: costiFissi[index] ?? 0,
      costiVariabili: costiVariabili[index] ?? 0,
      utile: calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, index),
      breakevenPoint: breakevenPoint,
    }));
  }, [planYear, selectedYear, causaliCatalog, getPlanConsuntivoValue]);

  // Helper function to find nice round numbers (like Excel)
  const findNiceNumber = (range: number): number => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
    const normalizedRange = range / magnitude;
    
    if (normalizedRange < 1.5) return magnitude;
    if (normalizedRange < 3) return 2 * magnitude;
    if (normalizedRange < 7) return 5 * magnitude;
    return 10 * magnitude;
  };

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

  // Calculate dynamic Y-axis range for fatturato chart (Excel-like autoscaling)
  const fatturatoYAxisDomain = useMemo(() => {
    const allValues = fatturatoChartData
      .flatMap(d => [d.fatturatoReale, d.fatturatoPrevisionale])
      .filter(v => v !== null && v !== undefined) as number[];
    
    if (allValues.length === 0) return [0, 100];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // Remove outliers (values that are more than 3x the median)
    const sortedValues = [...allValues].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    const filteredValues = allValues.filter(v => v <= median * 3);
    
    if (filteredValues.length === 0) {
      // Use original values if filtering removes everything
      const range = max - min;
      let padding;
      if (range < 10) {
        padding = range * 0.5;
      } else if (range < 100) {
        padding = range * 0.2;
      } else {
        padding = range * 0.1;
      }
      
      const paddedMin = Math.max(0, min - padding);
      const paddedMax = max + padding;
      const niceRange = findNiceNumber(paddedMax - paddedMin);
      const niceMin = Math.floor(paddedMin / niceRange) * niceRange;
      const niceMax = Math.ceil(paddedMax / niceRange) * niceRange;
      
      return [Math.max(0, niceMin), niceMax];
    } else {
      // Use filtered values for better scaling
      const filteredMin = Math.min(...filteredValues);
      const filteredMax = Math.max(...filteredValues);
      
      const range = filteredMax - filteredMin;
      let padding;
      if (range < 10) {
        padding = range * 0.5;
      } else if (range < 100) {
        padding = range * 0.2;
      } else {
        padding = range * 0.1;
      }
      
      const paddedMin = Math.max(0, filteredMin - padding);
      const paddedMax = filteredMax + padding;
      const niceRange = findNiceNumber(paddedMax - paddedMin);
      const niceMin = Math.floor(paddedMin / niceRange) * niceRange;
      const niceMax = Math.ceil(paddedMax / niceRange) * niceRange;
      
      return [Math.max(0, niceMin), niceMax];
    }
  }, [fatturatoChartData]);

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
            <Tooltip formatter={(value: number) => formatCurrencyValue(value)} />
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
