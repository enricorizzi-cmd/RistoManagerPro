// FinancialOverview Component - Financial charts premium
import React from 'react';
import { GlassCard } from './GlassCard';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency } from '../utils/formatters';
import type { FinancialDataPoint } from '../types/dashboard.types';

interface FinancialOverviewProps {
  data: FinancialDataPoint[];
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({
  data,
}) => {
  // Convert null to 0 for chart rendering
  // Sort by month to ensure chronological order, then show all available data
  const chartData = data
    .map(d => ({
      ...d,
      fatturato: d.fatturato ?? 0,
      fatturatoPrevisionale: d.fatturatoPrevisionale ?? 0,
      incassato: d.incassato ?? 0,
      utile: d.utile ?? 0,
    }))
    .sort((a, b) => {
      // Sort by month string (format: "Gen. 25", "Feb. 25", etc.)
      // Extract year and month for proper sorting
      const parseMonth = (monthStr: string) => {
        const monthNames = [
          'gen',
          'feb',
          'mar',
          'apr',
          'mag',
          'giu',
          'lug',
          'ago',
          'set',
          'ott',
          'nov',
          'dic',
        ];
        const parts = monthStr
          .toLowerCase()
          .replace(/\./g, '')
          .trim()
          .split(/\s+/);
        if (parts.length >= 2) {
          const monthIndex = monthNames.indexOf(parts[0]);
          const year = parseInt(parts[1]);
          if (monthIndex !== -1 && !isNaN(year)) {
            return new Date(
              year < 100 ? 2000 + year : year,
              monthIndex
            ).getTime();
          }
        }
        return 0;
      };
      return parseMonth(a.month) - parseMonth(b.month);
    });

  // If no data, show message
  if (chartData.length === 0) {
    return (
      <GlassCard>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Fatturato & Previsioni
        </h2>
        <div className="flex h-[300px] items-center justify-center text-gray-500">
          <p>Nessun dato finanziario disponibile</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Fatturato & Previsioni
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="fatturato"
            stroke="#1E40AF"
            strokeWidth={3}
            name="Fatturato Reale"
            dot={{ fill: '#1E40AF', r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />
          <Line
            type="monotone"
            dataKey="fatturatoPrevisionale"
            stroke="#6366F1"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Fatturato Previsionale"
            dot={{ fill: '#6366F1', r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={true}
          />
          <Line
            type="monotone"
            dataKey="incassato"
            stroke="#10B981"
            strokeWidth={2}
            name="Incassato"
            dot={{ fill: '#10B981', r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={true}
          />
          <Line
            type="monotone"
            dataKey="utile"
            stroke="#EC4899"
            strokeWidth={2}
            name="Utile"
            dot={{ fill: '#EC4899', r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </GlassCard>
  );
};
