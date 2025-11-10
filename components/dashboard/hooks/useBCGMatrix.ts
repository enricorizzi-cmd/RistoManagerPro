// useBCGMatrix Hook - BCG Matrix calculations
import { useMemo } from 'react';
import type { BCGRecipe } from '../types/dashboard.types';
import { calculateBCGQuadrants } from '../utils/dashboardCalculations';

export function useBCGMatrix(recipes: BCGRecipe[]) {
  const quadrants = useMemo(() => {
    if (recipes.length === 0) {
      return {
        stars: [],
        plowhorses: [],
        puzzles: [],
        dogs: [],
      };
    }

    return calculateBCGQuadrants(recipes);
  }, [recipes]);

  const stats = useMemo(() => {
    return {
      total: recipes.length,
      stars: quadrants.stars.length,
      plowhorses: quadrants.plowhorses.length,
      puzzles: quadrants.puzzles.length,
      dogs: quadrants.dogs.length,
    };
  }, [recipes, quadrants]);

  return {
    quadrants,
    stats,
  };
}
