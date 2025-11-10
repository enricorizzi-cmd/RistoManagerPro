// SalesAnalysis Component - Sales charts
import React from 'react';
import { GlassCard } from './GlassCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '../utils/formatters';
import type { SalesAnalysisData } from '../types/dashboard.types';

interface SalesAnalysisProps {
  data: SalesAnalysisData;
}

const COLORS = [
  '#1E40AF',
  '#6366F1',
  '#EC4899',
  '#10B981',
  '#FBBF24',
  '#EF4444',
];

export const SalesAnalysis: React.FC<SalesAnalysisProps> = ({ data }) => {
  if (!data.topDishes || data.topDishes.length === 0) {
    return (
      <div className="space-y-6">
        <GlassCard>
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Top 10 Piatti
          </h2>
          <div className="flex h-[250px] items-center justify-center text-gray-500">
            <p>Nessun dato vendite disponibile</p>
          </div>
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Distribuzione per Categoria
          </h2>
          <div className="flex h-[250px] items-center justify-center text-gray-500">
            <p>Nessun dato vendite disponibile</p>
          </div>
        </GlassCard>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Top Dishes */}
      <GlassCard>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Top 10 Piatti</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.topDishes.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="dishName"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 10 }}
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
            <Bar dataKey="value" fill="#1E40AF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Category Distribution */}
      <GlassCard>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Distribuzione per Categoria
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data.categoryDistribution}
              cx="50%"
              cy="40%"
              labelLine={false}
              label={({ percentage }) => `${percentage.toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.categoryDistribution.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                formatCurrency(value),
                `${props.payload.category} (${props.payload.percentage.toFixed(1)}%)`,
              ]}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={80}
              formatter={(value: string, entry: any) => {
                const category = entry.payload.category;
                const percentage = entry.payload.percentage.toFixed(1);
                // Truncate long category names
                const maxLength = 20;
                const truncated =
                  category.length > maxLength
                    ? `${category.substring(0, maxLength)}...`
                    : category;
                return `${truncated}: ${percentage}%`;
              }}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
};
