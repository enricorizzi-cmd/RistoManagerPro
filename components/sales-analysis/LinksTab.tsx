import React, { useState, useEffect, useCallback } from 'react';
import { PencilIcon, XIcon, CheckCircleIcon } from '../icons/Icons';
import {
  getDishes,
  linkDish,
  archiveDish,
} from '../../services/salesAnalysisApi';
import { useAppContext } from '../../contexts/AppContext';
import { getRecipes } from '../../services/menuEngineeringApi';

interface LinksTabProps {
  locationId: string;
}

const ITEMS_PER_PAGE = 50;

const LinksTab: React.FC<LinksTabProps> = ({ locationId }) => {
  const { showNotification } = useAppContext();
  const [dishes, setDishes] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'linked' | 'unlinked' | 'archived'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDish, setEditingDish] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDishes, setTotalDishes] = useState(0);
  const [totalLinked, setTotalLinked] = useState(0);
  const [totalUnlinked, setTotalUnlinked] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [filter]);

  // Debounce search - reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadDishes();
    loadRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, filter, currentPage, searchTerm]);

  const loadDishes = useCallback(async () => {
    setLoading(true);
    try {
      // Archiviati sono sempre non collegati
      const isArchivedView = filter === 'archived';
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const result = await getDishes(locationId, {
        linked:
          filter === 'all'
            ? undefined
            : filter === 'linked'
              ? true
              : filter === 'unlinked' || isArchivedView
                ? false
                : undefined,
        archived: isArchivedView ? true : undefined,
        search: searchTerm || undefined,
        limit: ITEMS_PER_PAGE,
        offset: offset,
      });
      setDishes(result.dishes);
      setTotalDishes(result.total || 0);
      setHasMore(result.pagination?.hasMore || false);
      
      // Load totals for stats (only on first page and when not searching)
      if (currentPage === 1 && !searchTerm) {
        const allResult = await getDishes(locationId, {
          linked: undefined,
          archived: false,
          limit: 10000, // Get all for counting
          offset: 0,
        });
        const allDishes = allResult.dishes;
        setTotalLinked(allDishes.filter(d => d.is_linked && !d.is_archived).length);
        setTotalUnlinked(allDishes.filter(d => !d.is_linked && !d.is_archived).length);
      }
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
  }, [locationId, filter, currentPage, searchTerm, showNotification]);

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

  const handleArchive = async (dishId: string, archived: boolean) => {
    try {
      await archiveDish(locationId, dishId, archived);
      showNotification(
        archived
          ? 'Piatto archiviato con successo'
          : 'Piatto disarchiviato con successo',
        'success'
      );
      await loadDishes();
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Errore nell'archiviazione del piatto",
        'error'
      );
    }
  };

  // Use total counts from API when available, otherwise fallback to current page
  const linkedCount = currentPage === 1 ? totalLinked : dishes.filter(d => d.is_linked && !d.is_archived).length;
  const unlinkedCount = currentPage === 1 ? totalUnlinked : dishes.filter(
    d => !d.is_linked && !d.is_archived
  ).length;
  
  const totalPages = Math.ceil(totalDishes / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Totale Piatti</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalDishes}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-green-600">Collegati</div>
          <div className="text-2xl font-bold text-green-700">{totalLinked}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-sm text-yellow-600">Non Collegati</div>
          <div className="text-2xl font-bold text-yellow-700">
            {totalUnlinked}
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
                filter === 'unlinked' || filter === 'archived'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Non Collegati
            </button>
            {(filter === 'unlinked' || filter === 'archived') && (
              <button
                onClick={() =>
                  setFilter(filter === 'archived' ? 'unlinked' : 'archived')
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'archived'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'archived'
                  ? '← Torna a Non Collegati'
                  : 'Archiviati'}
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Cerca piatto..."
            value={searchTerm}
            onChange={e => {
              const value = e.target.value;
              setSearchTerm(value);
              setCurrentPage(1); // Reset to first page on search
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
                {dishes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {filter === 'archived'
                        ? 'Nessun piatto archiviato'
                        : 'Nessun piatto trovato'}
                    </td>
                  </tr>
                ) : (
                  dishes.map(dish => (
                    <tr
                      key={dish.id}
                      className={
                        dish.is_archived ? 'bg-gray-50 opacity-75' : ''
                      }
                    >
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
                              dish.is_linked
                                ? 'text-green-600'
                                : 'text-gray-400'
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
                              title="Salva"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingDish(null);
                                setSelectedRecipeId(null);
                              }}
                              className="text-gray-600 hover:text-gray-700"
                              title="Annulla"
                            >
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingDish(dish.id);
                                setSelectedRecipeId(dish.recipe_id);
                              }}
                              className="text-primary hover:text-primary-600"
                              title="Modifica"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            {!dish.is_archived && (
                              <button
                                onClick={() => handleArchive(dish.id, true)}
                                className="text-gray-500 hover:text-gray-700"
                                title="Archivia"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                                  />
                                </svg>
                              </button>
                            )}
                            {dish.is_archived && (
                              <button
                                onClick={() => handleArchive(dish.id, false)}
                                className="text-blue-500 hover:text-blue-700"
                                title="Disarchivia"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Precedente
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading || !hasMore}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Successivo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalDishes)}
                  </span>{' '}
                  di <span className="font-medium">{totalDishes}</span> risultati
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Precedente</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading || !hasMore}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Successivo</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinksTab;
