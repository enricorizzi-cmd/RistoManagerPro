import React, { useState, useMemo, useCallback } from 'react';
import { CalendarIcon } from '../icons/Icons';
import type { Recipe, RecipeCategory, RecipeSales, BCGMatrix } from './types';

type TimeGranularity =
  | 'mese'
  | 'trimestre'
  | 'quadrimestre'
  | 'semestre'
  | 'anno'
  | 'totale';

interface MenuMixProps {
  recipes: Recipe[];
  recipeSales: RecipeSales[]; // Dati venduti (da integrare con scheda Vendite)
  onRecipeClick?: (recipe: Recipe) => void;
}

const MenuMix: React.FC<MenuMixProps> = ({
  recipes,
  recipeSales,
  onRecipeClick,
}) => {
  const [activeCategory, setActiveCategory] =
    useState<RecipeCategory>('antipasti');
  const [granularity, setGranularity] = useState<TimeGranularity>('anno');
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);

  const categories: { key: RecipeCategory; label: string }[] = [
    { key: 'antipasti', label: 'Antipasti' },
    { key: 'primi', label: 'Primi' },
    { key: 'secondi', label: 'Secondi' },
    { key: 'contorni', label: 'Contorni' },
    { key: 'pizze', label: 'Pizze' },
    { key: 'dessert', label: 'Dessert' },
    { key: 'altro', label: 'Altro' },
    { key: 'tutti', label: 'Tutti' },
  ];

  // Filter recipe sales by time period
  const filteredRecipeSales = useMemo(() => {
    if (granularity === 'totale') {
      return recipeSales;
    }

    return recipeSales.filter(sale => {
      const saleDate = new Date(sale.date);
      const saleYear = saleDate.getFullYear();
      const saleMonth = saleDate.getMonth() + 1;

      switch (granularity) {
        case 'mese':
          return saleYear === periodYear && saleMonth === periodMonth;
        case 'trimestre': {
          const quarter = Math.ceil(periodMonth / 3);
          const saleQuarter = Math.ceil(saleMonth / 3);
          return saleYear === periodYear && saleQuarter === quarter;
        }
        case 'quadrimestre': {
          const quadrimestre = Math.ceil(periodMonth / 4);
          const saleQuadrimestre = Math.ceil(saleMonth / 4);
          return saleYear === periodYear && saleQuadrimestre === quadrimestre;
        }
        case 'semestre': {
          const semester = periodMonth <= 6 ? 1 : 2;
          const saleSemester = saleMonth <= 6 ? 1 : 2;
          return saleYear === periodYear && saleSemester === semester;
        }
        case 'anno':
          return saleYear === periodYear;
        default:
          return true;
      }
    });
  }, [recipeSales, granularity, periodYear, periodMonth]);

  // Filter recipes by category
  const filteredRecipes = useMemo(() => {
    if (activeCategory === 'tutti') {
      return recipes;
    }
    return recipes.filter(r => r.categoria === activeCategory);
  }, [recipes, activeCategory]);

  // Get recipe popularity (based on sales quantity) - now uses filtered sales
  const getRecipePopularity = useCallback(
    (recipeId: string): number => {
      const sales = filteredRecipeSales.filter(s => s.recipeId === recipeId);
      const totalQuantity = sales.reduce((sum, s) => sum + s.quantity, 0);

      // Normalize to 0-100 scale (you can adjust this based on your data)
      const maxSales = Math.max(
        ...filteredRecipes.map(r =>
          filteredRecipeSales
            .filter(s => s.recipeId === r.id)
            .reduce((sum, s) => sum + s.quantity, 0)
        ),
        1
      );

      return maxSales > 0 ? (totalQuantity / maxSales) * 100 : 0;
    },
    [filteredRecipes, filteredRecipeSales]
  );

  // Calculate BCG Matrix
  const bcgMatrix = useMemo<BCGMatrix>(() => {
    // Calculate average popularity and margin for reference
    const totalPopularity = filteredRecipes.reduce(
      (sum, r) => sum + getRecipePopularity(r.id),
      0
    );
    const avgPopularity =
      filteredRecipes.length > 0 ? totalPopularity / filteredRecipes.length : 0;

    const totalMargin = filteredRecipes.reduce(
      (sum, r) => sum + r.marginalita,
      0
    );
    const avgMargin =
      filteredRecipes.length > 0 ? totalMargin / filteredRecipes.length : 0;

    const stars: Recipe[] = [];
    const questionMarks: Recipe[] = [];
    const cashCows: Recipe[] = [];
    const dogs: Recipe[] = [];

    filteredRecipes.forEach(recipe => {
      const popularity = getRecipePopularity(recipe.id);
      const margin = recipe.marginalita;

      if (popularity >= avgPopularity && margin >= avgMargin) {
        stars.push(recipe);
      } else if (popularity < avgPopularity && margin >= avgMargin) {
        questionMarks.push(recipe);
      } else if (popularity >= avgPopularity && margin < avgMargin) {
        cashCows.push(recipe);
      } else {
        dogs.push(recipe);
      }
    });

    // Sort each quadrant by marginalità descending
    stars.sort((a, b) => b.marginalita - a.marginalita);
    questionMarks.sort((a, b) => b.marginalita - a.marginalita);
    cashCows.sort((a, b) => b.marginalita - a.marginalita);
    dogs.sort((a, b) => b.marginalita - a.marginalita);

    return { stars, questionMarks, cashCows, dogs };
  }, [filteredRecipes, getRecipePopularity]);

  // Calculate average values for reference lines
  const avgPopularity = useMemo(() => {
    const total = filteredRecipes.reduce(
      (sum, r) => sum + getRecipePopularity(r.id),
      0
    );
    return filteredRecipes.length > 0 ? total / filteredRecipes.length : 50;
  }, [filteredRecipes, getRecipePopularity]);

  const avgMargin = useMemo(() => {
    const total = filteredRecipes.reduce((sum, r) => sum + r.marginalita, 0);
    return filteredRecipes.length > 0 ? total / filteredRecipes.length : 50;
  }, [filteredRecipes]);

  const Quadrant: React.FC<{
    title: string;
    recipes: Recipe[];
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: string;
  }> = ({ title, recipes, bgColor, borderColor, textColor, icon }) => {
    return (
      <div
        className={`rounded-lg border-2 p-4 h-full min-h-[300px] ${bgColor} ${borderColor}`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{icon}</span>
          <h3 className={`font-bold text-lg ${textColor}`}>{title}</h3>
          <span
            className={`ml-auto text-sm font-medium ${textColor} bg-white/30 px-2 py-1 rounded`}
          >
            {recipes.length}
          </span>
        </div>
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {recipes.length === 0 ? (
            <p className={`text-sm ${textColor} opacity-70 italic`}>
              Nessuna ricetta
            </p>
          ) : (
            recipes.map(recipe => (
              <div
                key={recipe.id}
                onClick={() => onRecipeClick?.(recipe)}
                className="bg-white/80 hover:bg-white cursor-pointer p-2 rounded border border-white/50 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {recipe.nomePiatto}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-600">
                      <span>
                        Pop: {getRecipePopularity(recipe.id).toFixed(0)}%
                      </span>
                      <span>Marg: {recipe.marginalita.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 text-sm">
                      €{recipe.prezzoVendita.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Costo: €{recipe.foodCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Menu Mix</h2>
        <p className="mt-1 text-sm text-gray-600">
          Analisi BCG Matrix per ottimizzare il tuo menu
        </p>
      </div>

      {/* Time Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtro Temporale</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Granularità
            </label>
            <select
              value={granularity}
              onChange={e => setGranularity(e.target.value as TimeGranularity)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="mese">Mese</option>
              <option value="trimestre">Trimestre</option>
              <option value="quadrimestre">Quadrimestre</option>
              <option value="semestre">Semestre</option>
              <option value="anno">Anno</option>
              <option value="totale">Totale</option>
            </select>
          </div>
          {granularity !== 'totale' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anno
                </label>
                <input
                  type="number"
                  value={periodYear}
                  onChange={e => setPeriodYear(parseInt(e.target.value))}
                  min={2020}
                  max={2100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {(granularity === 'mese' ||
                granularity === 'trimestre' ||
                granularity === 'quadrimestre' ||
                granularity === 'semestre') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mese
                  </label>
                  <select
                    value={periodMonth}
                    onChange={e => setPeriodMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {new Date(2000, month - 1).toLocaleString('it-IT', {
                          month: 'long',
                        })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Vendite filtrate: {filteredRecipeSales.length}
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-t-xl text-sm font-medium transition ${
              activeCategory === cat.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* BCG Matrix */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Matrice BCG
          </h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              <strong>Popolarità media:</strong> {avgPopularity.toFixed(1)}% |{' '}
              <strong>Marginalità media:</strong> {avgMargin.toFixed(1)}%
            </p>
            <p className="text-gray-500 italic">
              I dati di vendita provengono dalla scheda Vendite (da integrare)
            </p>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top Row: High Margin */}
          <Quadrant
            title="Stelle"
            recipes={bcgMatrix.stars}
            bgColor="bg-gradient-to-br from-green-50 to-emerald-100"
            borderColor="border-green-400"
            textColor="text-green-800"
            icon="⭐"
          />
          <Quadrant
            title="Punti Interrogativi"
            recipes={bcgMatrix.questionMarks}
            bgColor="bg-gradient-to-br from-blue-50 to-cyan-100"
            borderColor="border-blue-400"
            textColor="text-blue-800"
            icon="❓"
          />

          {/* Bottom Row: Low Margin */}
          <Quadrant
            title="Mucche da Latte"
            recipes={bcgMatrix.cashCows}
            bgColor="bg-gradient-to-br from-yellow-50 to-amber-100"
            borderColor="border-yellow-400"
            textColor="text-yellow-800"
            icon="🐄"
          />
          <Quadrant
            title="Cani"
            recipes={bcgMatrix.dogs}
            bgColor="bg-gradient-to-br from-red-50 to-rose-100"
            borderColor="border-red-400"
            textColor="text-red-800"
            icon="🐕"
          />
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Legenda:</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-medium text-gray-700 mb-1">⭐ Stelle:</p>
              <p className="text-gray-600">
                Alta popolarità, alto margine. Mantieni e promuovi questi
                piatti.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">
                ❓ Punti Interrogativi:
              </p>
              <p className="text-gray-600">
                Bassa popolarità, alto margine. Considera strategie di
                marketing.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">
                🐄 Mucche da Latte:
              </p>
              <p className="text-gray-600">
                Alta popolarità, basso margine. Ottimizza i costi o aumenta il
                prezzo.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">🐕 Cani:</p>
              <p className="text-gray-600">
                Bassa popolarità, basso margine. Valuta la rimozione dal menu.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {bcgMatrix.stars.length}
          </div>
          <div className="text-sm text-gray-600 mt-1">Stelle</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {bcgMatrix.questionMarks.length}
          </div>
          <div className="text-sm text-gray-600 mt-1">Punti Interrogativi</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">
            {bcgMatrix.cashCows.length}
          </div>
          <div className="text-sm text-gray-600 mt-1">Mucche da Latte</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {bcgMatrix.dogs.length}
          </div>
          <div className="text-sm text-gray-600 mt-1">Cani</div>
        </div>
      </div>
    </div>
  );
};

export default MenuMix;
