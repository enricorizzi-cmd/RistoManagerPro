// BCGMatrix Component - BCG Matrix scatter plot
import React, { useMemo } from 'react';
import { GlassCard } from './GlassCard';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { BCGRecipe } from '../types/dashboard.types';
import { useBCGMatrix } from '../hooks/useBCGMatrix';

interface BCGMatrixProps {
  recipes: BCGRecipe[];
}

// Color mapping for categories
const CATEGORY_COLORS: Record<string, string> = {
  antipasti: '#8B5CF6', // Purple
  primi: '#3B82F6', // Blue
  secondi: '#EF4444', // Red
  contorni: '#10B981', // Green
  pizze: '#F97316', // Orange
  dessert: '#F59E0B', // Amber
  altro: '#6B7280', // Gray
};

const getCategoryColor = (categoria: string): string => {
  return CATEGORY_COLORS[categoria.toLowerCase()] || '#6B7280';
};

export const BCGMatrix: React.FC<BCGMatrixProps> = ({ recipes }) => {
  // Note: quadrants calculation available but not used in current implementation
  useBCGMatrix(recipes);

  // Group recipes by category for legend
  const recipesByCategory = useMemo(() => {
    const grouped: Record<string, BCGRecipe[]> = {};
    recipes.forEach(recipe => {
      const cat = recipe.categoria.toLowerCase();
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(recipe);
    });
    return grouped;
  }, [recipes]);

  if (recipes.length === 0) {
    return (
      <GlassCard>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Matrice BCG</h2>
        <div className="flex h-[300px] items-center justify-center text-gray-500">
          <p>Nessun dato disponibile per la matrice BCG</p>
        </div>
      </GlassCard>
    );
  }

  const data = recipes.map(r => ({
    x: r.popolarita,
    y: r.marginalita,
    name: r.nome,
    fatturato: r.fatturato,
    categoria: r.categoria,
    ...r,
  }));

  // Calculate dynamic Y domain based on actual data
  const marginalitaValues = data
    .map(d => d.y)
    .filter(v => !isNaN(v) && isFinite(v));
  const minMarginalita =
    marginalitaValues.length > 0 ? Math.min(...marginalitaValues) : -100;
  const maxMarginalita =
    marginalitaValues.length > 0 ? Math.max(...marginalitaValues) : 100;

  // Add padding to domain (10% on each side)
  const yDomainPadding = Math.max(
    Math.abs(maxMarginalita - minMarginalita) * 0.1,
    10
  );
  const yDomainMin = Math.min(minMarginalita - yDomainPadding, -100);
  const yDomainMax = Math.max(maxMarginalita + yDomainPadding, 100);

  return (
    <GlassCard>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Matrice BCG</h2>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name="Popolarità"
            label={{
              value: 'Popolarità (%)',
              position: 'insideBottom',
              offset: -5,
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            allowDataOverflow={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Marginalità"
            label={{
              value: 'Marginalità (%)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
            domain={[yDomainMin, yDomainMax]}
            tick={{ fontSize: 11 }}
            allowDataOverflow={false}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900">{data.name}</p>
                    <p className="text-sm text-gray-600">
                      Categoria: {data.categoria}
                    </p>
                    <p className="text-sm">Popolarità: {data.x.toFixed(1)}%</p>
                    <p className="text-sm">Marginalità: {data.y.toFixed(1)}%</p>
                    <p className="text-sm font-medium">
                      Fatturato: €{data.fatturato.toFixed(2)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Quadrant areas - MUST be before Scatter to render behind points */}
          {/* Full chart coverage: X [0-100], Y [yDomainMin to yDomainMax] */}
          {/* Meta line is at 50% of Y domain, not fixed at 50 */}
          <ReferenceArea
            x1={0}
            x2={50}
            y1={yDomainMin}
            y2={(yDomainMin + yDomainMax) / 2}
            fill="#EF4444"
            fillOpacity={0.2}
            stroke="none"
          />
          <ReferenceArea
            x1={50}
            x2={100}
            y1={yDomainMin}
            y2={(yDomainMin + yDomainMax) / 2}
            fill="#6366F1"
            fillOpacity={0.2}
            stroke="none"
          />
          <ReferenceArea
            x1={0}
            x2={50}
            y1={(yDomainMin + yDomainMax) / 2}
            y2={yDomainMax}
            fill="#FBBF24"
            fillOpacity={0.2}
            stroke="none"
          />
          <ReferenceArea
            x1={50}
            x2={100}
            y1={(yDomainMin + yDomainMax) / 2}
            y2={yDomainMax}
            fill="#10B981"
            fillOpacity={0.2}
            stroke="none"
          />
          {/* Reference lines for meta (50% thresholds) - on top of areas */}
          <ReferenceLine
            x={50}
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: 'Meta Popolarità',
              position: 'top',
              fontSize: 10,
              fill: '#6B7280',
            }}
          />
          <ReferenceLine
            y={(yDomainMin + yDomainMax) / 2}
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: 'Meta Marginalità',
              position: 'right',
              fontSize: 10,
              fill: '#6B7280',
            }}
          />
          <Scatter dataKey="y" fill="#8884d8">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getCategoryColor(entry.categoria)}
                stroke="#fff"
                strokeWidth={1.5}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Category Legend */}
      <div className="mt-4 border-t pt-4">
        <p className="text-xs font-semibold text-gray-600 mb-2 text-center">
          Categorie
        </p>
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          {Object.keys(recipesByCategory).map(categoria => (
            <div key={categoria} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getCategoryColor(categoria) }}
              />
              <span className="capitalize">
                {categoria} ({recipesByCategory[categoria].length})
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};
