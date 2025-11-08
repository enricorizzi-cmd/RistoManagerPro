import React, { useState, useEffect } from 'react';
import { PencilIcon, XIcon, CheckCircleIcon } from '../icons/Icons';
import { getDishes, linkDish } from '../../services/salesAnalysisApi';
import { useAppContext } from '../../contexts/AppContext';
import { getRecipes } from '../../services/menuEngineeringApi';

interface LinksTabProps {
  locationId: string;
}

const LinksTab: React.FC<LinksTabProps> = ({ locationId }) => {
  const { showNotification } = useAppContext();
  const [dishes, setDishes] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDish, setEditingDish] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    loadDishes();
    loadRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, filter]);

  const loadDishes = async () => {
    setLoading(true);
    try {
      const result = await getDishes(locationId, {
        linked: filter === 'all' ? undefined : filter === 'linked',
        search: searchTerm || undefined,
        limit: 100,
        offset: 0,
      });
      setDishes(result.dishes);
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : 'Errore nel caricamento dei piatti',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRecipes = async () => {
    try {
      const recipesData = await getRecipes(locationId);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  };

  const handleLink = async (dishId: string, recipeId: string | null) => {
    try {
      await linkDish(locationId, dishId, recipeId);
      showNotification('Collegamento aggiornato con successo', 'success');
      await loadDishes();
      setEditingDish(null);
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento del collegamento",
        'error'
      );
    }
  };

  const linkedCount = dishes.filter(d => d.is_linked).length;
  const unlinkedCount = dishes.filter(d => !d.is_linked).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Totale Piatti</div>
          <div className="text-2xl font-bold text-gray-900">
            {dishes.length}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-green-600">Collegati</div>
          <div className="text-2xl font-bold text-green-700">{linkedCount}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-sm text-yellow-600">Non Collegati</div>
          <div className="text-2xl font-bold text-yellow-700">
            {unlinkedCount}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilter('linked')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'linked'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Collegati
            </button>
            <button
              onClick={() => setFilter('unlinked')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'unlinked'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Non Collegati
            </button>
          </div>
          <input
            type="text"
            placeholder="Cerca piatto..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              // Debounce search
              setTimeout(() => loadDishes(), 500);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Dishes List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Caricamento...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Piatto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ricetta Collegata
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dishes.map(dish => (
                  <tr key={dish.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {dish.dish_name_original || dish.dish_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {dish.category_gestionale || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingDish === dish.id ? (
                        <select
                          value={selectedRecipeId || dish.recipe_id || ''}
                          onChange={e =>
                            setSelectedRecipeId(e.target.value || null)
                          }
                          className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Nessuna ricetta</option>
                          {recipes.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.nome_piatto}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={
                            dish.is_linked ? 'text-green-600' : 'text-gray-400'
                          }
                        >
                          {dish.is_linked
                            ? recipes.find(r => r.id === dish.recipe_id)
                                ?.nome_piatto || 'Sconosciuta'
                            : 'Non collegato'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingDish === dish.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleLink(dish.id, selectedRecipeId);
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingDish(null);
                              setSelectedRecipeId(null);
                            }}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            <XIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingDish(dish.id);
                            setSelectedRecipeId(dish.recipe_id);
                          }}
                          className="text-primary hover:text-primary-600"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinksTab;
