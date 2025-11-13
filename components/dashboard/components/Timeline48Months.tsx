// Timeline48Months Component - 48 months financial timeline
import React from 'react';
import { GlassCard } from './GlassCard';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
} from 'recharts';
import { formatCurrency } from '../utils/formatters';
import type { FinancialDataPoint } from '../types/dashboard.types';

interface Timeline48MonthsProps {
  data: FinancialDataPoint[];
}

export const Timeline48Months: React.FC<Timeline48MonthsProps> = ({ data }) => {
  // Show last 48 months or all available data
  const chartData = data.slice(-48);

  return (
    <GlassCard>
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Timeline Finanziaria 48 Mesi
      </h2>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={100}
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
          <Line
            type="monotone"
            dataKey="incassato"
            stroke="#10B981"
            strokeWidth={2}
            name="Versamenti Reali"
            dot={false}
          />
          <Bar
            dataKey="costiFissi"
            stackId="costi"
            fill="#EF4444"
            name="Costi Fissi"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="costiVariabili"
            stackId="costi"
            fill="#F97316"
            name="Costi Variabili"
            radius={[4, 4, 0, 0]}
          />
          <Area
            type="monotone"
            dataKey="utile"
            fill="#10B981"
            fillOpacity={0.3}
            stroke="#10B981"
            strokeWidth={2}
            name="Utile"
          />
          <Brush
            dataKey="month"
            height={30}
            stroke="#1E40AF"
            fill="rgba(30, 64, 175, 0.1)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </GlassCard>
  );
};
