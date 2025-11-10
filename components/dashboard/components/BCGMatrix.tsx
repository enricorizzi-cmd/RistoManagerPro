// BCGMatrix Component - BCG Matrix scatter plot
import React from 'react';
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
} from 'recharts';
import type { BCGRecipe } from '../types/dashboard.types';
import { useBCGMatrix } from '../hooks/useBCGMatrix';

interface BCGMatrixProps {
  recipes: BCGRecipe[];
}

export const BCGMatrix: React.FC<BCGMatrixProps> = ({ recipes }) => {
  const { quadrants } = useBCGMatrix(recipes);

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

  const getQuadrantColor = (recipe: BCGRecipe): string => {
    if (quadrants.stars.includes(recipe)) return '#10B981'; // Green - Stars
    if (quadrants.plowhorses.includes(recipe)) return '#FBBF24'; // Yellow - Plowhorses
    if (quadrants.puzzles.includes(recipe)) return '#6366F1'; // Blue - Puzzles
    return '#EF4444'; // Red - Dogs
  };

  const data = recipes.map(r => ({
    x: r.popolarita,
    y: r.marginalita,
    name: r.nome,
    fatturato: r.fatturato,
    ...r,
  }));

  return (
    <GlassCard>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Matrice BCG</h2>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Popolarità"
            label={{
              value: 'Popolarità (%)',
              position: 'insideBottom',
              offset: -5,
            }}
            domain={[0, 100]}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Marginalità"
            label={{
              value: 'Marginalità (%)',
              angle: -90,
              position: 'insideLeft',
            }}
            domain={[-100, 100]}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm">Popolarità: {data.x.toFixed(1)}%</p>
                    <p className="text-sm">Marginalità: {data.y.toFixed(1)}%</p>
                    <p className="text-sm">
                      Fatturato: €{data.fatturato.toFixed(2)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter dataKey="y" fill="#8884d8">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getQuadrantColor(entry)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Stars</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Plowhorses</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Puzzles</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Dogs</span>
        </div>
      </div>
    </GlassCard>
  );
};
