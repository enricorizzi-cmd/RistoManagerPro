import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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

const DEFAULT_ITEMS_PER_PAGE = 50;
const ITEMS_PER_PAGE_OPTIONS = [50, 100, 200];

type SortColumn = 'dish_name' | 'category' | 'recipe' | null;
type SortDirection = 'asc' | 'desc';

const LinksTab: React.FC<LinksTabProps> = ({ locationId }) => {
  const { showNotification } = useAppContext();
  const [dishes, setDishes] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'linked' | 'unlinked' | 'archived'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [recipeFilter, setRecipeFilter] = useState<string>('');
  const [editingDish, setEditingDish] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [totalDishes, setTotalDishes] = useState(0);
  const [totalLinked, setTotalLinked] = useState(0);
  const [totalUnlinked, setTotalUnlinked] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const categoryFilterRef = useRef<HTMLDivElement>(null);
  const [showRecipeFilter, setShowRecipeFilter] = useState(false);
  const recipeFilterRef = useRef<HTMLDivElement>(null);

  // Close category filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryFilterRef.current &&
        !categoryFilterRef.current.contains(event.target as Node)
      ) {
        setShowCategoryFilter(false);
      }
    };

    if (showCategoryFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryFilter]);

  // Close recipe filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        recipeFilterRef.current &&
        !recipeFilterRef.current.contains(event.target as Node)
      ) {
        setShowRecipeFilter(false);
      }
    };

    if (showRecipeFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRecipeFilter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [filter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when category filter changes
  }, [categoryFilter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when recipe filter changes
  }, [recipeFilter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when items per page changes
  }, [itemsPerPage]);

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
  }, [locationId, filter, currentPage, searchTerm, categoryFilter]);

  const loadDishes = useCallback(async () => {
    setLoading(true);
    try {
      // Quando archived, mostriamo tutti gli archiviati (collegati e non collegati)
      const isArchivedView = filter === 'archived';
      const offset = (currentPage - 1) * itemsPerPage;
      const result = await getDishes(locationId, {
        linked:
          filter === 'all'
            ? undefined
            : filter === 'linked'
              ? true
              : filter === 'unlinked'
                ? false
                : undefined, // Quando archived, non filtrare per linked (mostra tutti gli archiviati)
        archived: isArchivedView ? true : undefined,
        category: categoryFilter || undefined,
        search: searchTerm || undefined,
        limit: itemsPerPage,
        offset: offset,
      });
      setDishes(result.dishes);
      setTotalDishes(result.total || 0);
      setHasMore(result.pagination?.hasMore || false);

      // Load totals for stats (only on first page and when not searching)
      // Use the total from the API response instead of loading all dishes
      if (currentPage === 1 && !searchTerm) {
        // Get total linked count
        const linkedResult = await getDishes(locationId, {
          linked: true,
          archived: false,
          limit: 1, // We only need the total count
          offset: 0,
        });
        // Get total unlinked count
        const unlinkedResult = await getDishes(locationId, {
          linked: false,
          archived: false,
          limit: 1, // We only need the total count
          offset: 0,
        });
        setTotalLinked(linkedResult.total || 0);
        setTotalUnlinked(unlinkedResult.total || 0);
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
  }, [
    locationId,
    filter,
    currentPage,
    searchTerm,
    categoryFilter,
    itemsPerPage,
    showNotification,
  ]);

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
  // const linkedCount = currentPage === 1 ? totalLinked : dishes.filter(d => d.is_linked && !d.is_archived).length;
  // const unlinkedCount = currentPage === 1 ? totalUnlinked : dishes.filter(
  //   d => !d.is_linked && !d.is_archived
  // ).length;

  const totalPages = Math.ceil(totalDishes / itemsPerPage);

  // Get unique categories from all dishes (for filter dropdown)
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    dishes.forEach(dish => {
      if (dish.category_gestionale) {
        categories.add(dish.category_gestionale);
      }
    });
    return Array.from(categories).sort();
  }, [dishes]);

  // Get unique recipes from linked dishes (for filter dropdown)
  const uniqueRecipes = useMemo(() => {
    const recipeMap = new Map<string, { id: string; name: string }>();
    dishes.forEach(dish => {
      if (dish.is_linked && dish.recipe_id) {
        const recipe = recipes.find(r => r.id === dish.recipe_id);
        if (recipe && !recipeMap.has(dish.recipe_id)) {
          recipeMap.set(dish.recipe_id, {
            id: dish.recipe_id,
            name: recipe.nome_piatto,
          });
        }
      }
    });
    return Array.from(recipeMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [dishes, recipes]);

  // Filter and sort dishes
  const filteredAndSortedDishes = useMemo(() => {
    // Apply recipe filter (client-side since API doesn't support it)
    let filtered = dishes;
    if (recipeFilter) {
      filtered = filtered.filter(dish => dish.recipe_id === recipeFilter);
    }

    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'dish_name':
          aValue = (a.dish_name_original || a.dish_name || '').toLowerCase();
          bValue = (b.dish_name_original || b.dish_name || '').toLowerCase();
          break;
        case 'category':
          aValue = (a.category_gestionale || '').toLowerCase();
          bValue = (b.category_gestionale || '').toLowerCase();
          break;
        case 'recipe': {
          const aRecipe = recipes.find(r => r.id === a.recipe_id);
          const bRecipe = recipes.find(r => r.id === b.recipe_id);
          aValue = a.is_linked
            ? (aRecipe?.nome_piatto || 'Sconosciuta').toLowerCase()
            : 'zzz_non_collegato'; // Put non-linked at the end
          bValue = b.is_linked
            ? (bRecipe?.nome_piatto || 'Sconosciuta').toLowerCase()
            : 'zzz_non_collegato';
          break;
        }
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [dishes, sortColumn, sortDirection, recipes, recipeFilter]);

  const sortedDishes = filteredAndSortedDishes;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg
        className="w-4 h-4 ml-1 text-primary-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-primary-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Totale Piatti</div>
          <div className="text-2xl font-bold text-gray-900">{totalDishes}</div>
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
                filter === 'unlinked'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Non Collegati
            </button>
            <button
              onClick={() => setFilter('archived')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'archived'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Archiviati
            </button>
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
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('dish_name')}
                  >
                    <div className="flex items-center">
                      Piatto
                      <SortIcon column="dish_name" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase select-none relative">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1"
                        onClick={() => handleSort('category')}
                      >
                        Categoria
                        <SortIcon column="category" />
                      </div>
                      <div className="relative" ref={categoryFilterRef}>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setShowCategoryFilter(!showCategoryFilter);
                          }}
                          className={`p-1 rounded text-gray-600 hover:text-gray-900 ${
                            categoryFilter
                              ? 'bg-primary-100 text-primary-700'
                              : 'hover:bg-gray-200'
                          }`}
                          title="Filtra per categoria"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                            />
                          </svg>
                        </button>
                        {showCategoryFilter && (
                          <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                            <div className="p-2">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setCategoryFilter('');
                                  setShowCategoryFilter(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                                  categoryFilter === ''
                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                    : 'text-gray-700'
                                }`}
                              >
                                Tutte le categorie
                              </button>
                              {uniqueCategories.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  Nessuna categoria disponibile
                                </div>
                              ) : (
                                uniqueCategories.map(category => (
                                  <button
                                    key={category}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setCategoryFilter(category);
                                      setShowCategoryFilter(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                                      categoryFilter === category
                                        ? 'bg-primary-50 text-primary-700 font-medium'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {category}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {categoryFilter && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                          {categoryFilter}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase select-none relative">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1"
                        onClick={() => handleSort('recipe')}
                      >
                        Ricetta Collegata
                        <SortIcon column="recipe" />
                      </div>
                      <div className="relative" ref={recipeFilterRef}>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setShowRecipeFilter(!showRecipeFilter);
                          }}
                          className={`p-1 rounded text-gray-600 hover:text-gray-900 ${
                            recipeFilter
                              ? 'bg-primary-100 text-primary-700'
                              : 'hover:bg-gray-200'
                          }`}
                          title="Filtra per ricetta"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                            />
                          </svg>
                        </button>
                        {showRecipeFilter && (
                          <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                            <div className="p-2">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setRecipeFilter('');
                                  setShowRecipeFilter(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                                  recipeFilter === ''
                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                    : 'text-gray-700'
                                }`}
                              >
                                Tutte le ricette
                              </button>
                              {uniqueRecipes.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  Nessuna ricetta collegata disponibile
                                </div>
                              ) : (
                                uniqueRecipes.map(recipe => (
                                  <button
                                    key={recipe.id}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setRecipeFilter(recipe.id);
                                      setShowRecipeFilter(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                                      recipeFilter === recipe.id
                                        ? 'bg-primary-50 text-primary-700 font-medium'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {recipe.name}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {recipeFilter && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                          {recipes.find(r => r.id === recipeFilter)
                            ?.nome_piatto || 'Ricetta'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedDishes.length === 0 ? (
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
                  sortedDishes.map(dish => (
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
                onClick={() =>
                  setCurrentPage(prev => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages || loading || !hasMore}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Successivo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalDishes)}
                  </span>{' '}
                  di <span className="font-medium">{totalDishes}</span>{' '}
                  risultati
                </p>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="items-per-page"
                    className="text-sm text-gray-700"
                  >
                    Mostra:
                  </label>
                  <select
                    id="items-per-page"
                    value={itemsPerPage}
                    onChange={e => setItemsPerPage(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() =>
                      setCurrentPage(prev => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1 || loading}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Precedente</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
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
                    onClick={() =>
                      setCurrentPage(prev => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages || loading || !hasMore}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Successivo</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
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
