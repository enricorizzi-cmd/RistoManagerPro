// FinancialOverview Component - Financial charts premium
import React from 'react';
import { GlassCard } from './GlassCard';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
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
  const chartData = data.slice(-12); // Last 12 months

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
            strokeWidth={2}
            name="Fatturato Reale"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="fatturatoPrevisionale"
            stroke="#6366F1"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Fatturato Previsionale"
            dot={false}
          />
          <Bar
            dataKey="incassato"
            fill="#10B981"
            name="Incassato"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="utile"
            fill="#EC4899"
            name="Utile"
            radius={[4, 4, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </GlassCard>
  );
};
