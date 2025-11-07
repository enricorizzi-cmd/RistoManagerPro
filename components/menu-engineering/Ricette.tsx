import React, { useState, useMemo } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, XIcon } from '../icons/Icons';
import SearchableSelect from '../ui/SearchableSelect';
import type {
  Recipe,
  RecipeCategory,
  RecipeIngredient,
  RawMaterial,
} from './types';

interface RicetteProps {
  recipes: Recipe[];
  rawMaterials: RawMaterial[];
  onAdd: (
    recipe: Omit<Recipe, 'id' | 'foodCost' | 'utile' | 'marginalita'>
  ) => void;
  onUpdate: (id: string, recipe: Partial<Recipe>) => void;
  onDelete: (id: string) => void;
  onReorder: (recipeIds: string[]) => void;
  isReadOnly?: boolean;
}

const Ricette: React.FC<RicetteProps> = ({
  recipes,
  rawMaterials,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  isReadOnly = false,
}) => {
  const [activeCategory, setActiveCategory] =
    useState<RecipeCategory>('antipasti');
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [draggedRecipeId, setDraggedRecipeId] = useState<string | null>(null);

  const categories: { key: RecipeCategory; label: string }[] = [
    { key: 'antipasti', label: 'Antipasti' },
    { key: 'primi', label: 'Primi' },
    { key: 'secondi', label: 'Secondi' },
    { key: 'dessert', label: 'Dessert' },
    { key: 'altro', label: 'Altro' },
    { key: 'tutti', label: 'Tutti' },
  ];

  // Filter recipes by category
  const filteredRecipes = useMemo(() => {
    if (activeCategory === 'tutti') {
      return [...recipes].sort((a, b) => a.order - b.order);
    }
    return recipes
      .filter(r => r.categoria === activeCategory)
      .sort((a, b) => a.order - b.order);
  }, [recipes, activeCategory]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, recipeId: string) => {
    setDraggedRecipeId(recipeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetRecipeId: string) => {
    e.preventDefault();
    if (!draggedRecipeId || draggedRecipeId === targetRecipeId) return;

    const draggedIndex = filteredRecipes.findIndex(
      r => r.id === draggedRecipeId
    );
    const targetIndex = filteredRecipes.findIndex(r => r.id === targetRecipeId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newRecipes = [...filteredRecipes];
    const [removed] = newRecipes.splice(draggedIndex, 1);
    newRecipes.splice(targetIndex, 0, removed);

    // Update order
    const reorderedIds = newRecipes.map(r => r.id);
    onReorder(reorderedIds);

    setDraggedRecipeId(null);
  };

  const handleDragEnd = () => {
    setDraggedRecipeId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Ricette
          </h2>
          <p className="mt-1 text-xs md:text-sm text-gray-600">
            Crea e gestisci le ricette del tuo menu
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => {
              setEditingRecipeId(null);
              setShowRecipeModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm w-full sm:w-auto justify-center text-sm md:text-base"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nuova Ricetta</span>
          </button>
        )}
        {isReadOnly && (
          <div className="text-xs md:text-sm text-gray-500 italic">
            Visualizzazione aggregata - Modifiche non disponibili
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-t-xl text-xs md:text-sm font-medium transition whitespace-nowrap ${
              activeCategory === cat.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-3 md:p-4 rounded-lg shadow border border-gray-200 gap-2">
        <span className="text-xs md:text-sm text-gray-600">
          {filteredRecipes.length} ricetta
          {filteredRecipes.length !== 1 ? 'e' : ''} visualizzata
          {filteredRecipes.length !== 1 ? 'e' : ''}
        </span>
      </div>

      {/* Recipe Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRecipes.map(recipe => (
          <div
            key={recipe.id}
            className={`min-h-[300px] md:min-h-[400px] rounded-lg border-2 transition-all ${
              draggedRecipeId === recipe.id
                ? 'border-primary bg-primary-50 opacity-50'
                : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
            }`}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, recipe.id)}
          >
            <RecipeCard
              recipe={recipe}
              rawMaterials={rawMaterials}
              onEdit={() => {
                if (!isReadOnly) {
                  setEditingRecipeId(recipe.id);
                  setShowRecipeModal(true);
                }
              }}
              onDelete={() => {
                if (!isReadOnly) {
                  if (
                    window.confirm(
                      `Sei sicuro di voler eliminare "${recipe.nomePiatto}"?`
                    )
                  ) {
                    onDelete(recipe.id);
                  }
                }
              }}
              onDragStart={e => !isReadOnly && handleDragStart(e, recipe.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggedRecipeId === recipe.id}
              isReadOnly={isReadOnly}
            />
          </div>
        ))}
      </div>

      {/* Recipe Modal */}
      {showRecipeModal && (
        <RecipeModal
          recipe={
            editingRecipeId
              ? recipes.find(r => r.id === editingRecipeId) || null
              : null
          }
          rawMaterials={rawMaterials}
          category={activeCategory === 'tutti' ? 'antipasti' : activeCategory}
          onClose={() => {
            setShowRecipeModal(false);
            setEditingRecipeId(null);
          }}
          onSave={async recipeData => {
            try {
              if (editingRecipeId) {
                await onUpdate(editingRecipeId, recipeData);
              } else {
                const maxOrder =
                  filteredRecipes.length > 0
                    ? Math.max(...filteredRecipes.map(r => r.order))
                    : -1;
                await onAdd({ ...recipeData, order: maxOrder + 1 });
              }
              setShowRecipeModal(false);
              setEditingRecipeId(null);
            } catch (error) {
              console.error('Error saving recipe:', error);
              alert('Errore nel salvataggio della ricetta. Riprova.');
            }
          }}
        />
      )}
    </div>
  );
};

// Recipe Card Component
interface RecipeCardProps {
  recipe: Recipe;
  rawMaterials: RawMaterial[];
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isReadOnly?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
  isReadOnly = false,
}) => {
  return (
    <div
      draggable={!isReadOnly}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`h-full flex flex-col ${isReadOnly ? '' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {/* Header with Name and Price */}
      <div className="bg-white border-b border-gray-200 p-2 md:p-3 rounded-t-lg">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base md:text-lg text-gray-900 break-words">
              {recipe.nomePiatto}
            </h3>
          </div>
          {!isReadOnly && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600"
                title="Modifica"
              >
                <PencilIcon className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600"
                title="Elimina"
              >
                <TrashIcon className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">
            Prezzo di Vendita:
          </span>
          <span className="text-sm md:text-base font-bold text-gray-900">
            €{recipe.prezzoVendita.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="flex-1 p-2 md:p-3 overflow-x-auto">
        {recipe.ingredienti.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-xs border-2 border-dashed border-gray-200 rounded-lg">
            Nessun ingrediente aggiunto
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs min-w-[400px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-1.5 px-2 text-gray-600 font-medium">
                    Cod.
                  </th>
                  <th className="text-left py-1.5 px-2 text-gray-600 font-medium">
                    Materia Prima
                  </th>
                  <th className="text-right py-1.5 px-2 text-gray-600 font-medium">
                    UM
                  </th>
                  <th className="text-right py-1.5 px-2 text-gray-600 font-medium">
                    Peso
                  </th>
                  <th className="text-right py-1.5 px-2 text-gray-600 font-medium">
                    Costo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recipe.ingredienti.map((ing, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-1.5 px-2 text-gray-900 text-xs">
                      {ing.codMateria}
                    </td>
                    <td
                      className="py-1.5 px-2 text-gray-700 text-xs truncate max-w-[120px]"
                      title={ing.materiaPrima}
                    >
                      {ing.materiaPrima}
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-600 text-xs">
                      {ing.unitaMisura}
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-700 text-xs">
                      {ing.peso.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium text-gray-900 text-xs">
                      €{ing.costo.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td
                    colSpan={4}
                    className="py-2 px-2 text-xs font-bold text-gray-700"
                  >
                    FOOD COST DEL PIATTO
                  </td>
                  <td className="py-2 px-2 text-right text-xs font-bold text-primary-600">
                    €{recipe.foodCost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Summary - matching form layout */}
      <div className="px-2 md:px-3 pb-2 md:pb-3">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
            <div>
              <span className="text-gray-600">Food Cost:</span>
              <span className="ml-2 font-bold text-gray-900">
                €{recipe.foodCost.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Utile:</span>
              <span className="ml-2 font-bold text-green-700">
                €{recipe.utile.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Marginalità:</span>
              <span className="ml-2 font-bold text-green-700">
                {recipe.marginalita.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Recipe Modal Component
interface RecipeModalProps {
  recipe: Recipe | null;
  rawMaterials: RawMaterial[];
  category: RecipeCategory;
  onClose: () => void;
  onSave: (
    recipe: Omit<Recipe, 'id' | 'foodCost' | 'utile' | 'marginalita' | 'order'>
  ) => void;
}

const RecipeModal: React.FC<RecipeModalProps> = ({
  recipe,
  rawMaterials,
  category,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    nomePiatto: recipe?.nomePiatto || '',
    categoria: recipe?.categoria || category,
    prezzoVendita: recipe?.prezzoVendita.toString() || '',
    ingredienti: recipe?.ingredienti || ([] as RecipeIngredient[]),
  });

  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<
    number | null
  >(null);
  const [ingredientForm, setIngredientForm] = useState({
    codMateria: '',
    materiaPrima: '',
    unitaMisura: 'KG' as 'KG' | 'GR' | 'LT' | 'ML' | 'PZ',
    peso: '',
  });

  // Calculate food cost, profit, and margin
  const foodCost = useMemo(() => {
    return formData.ingredienti.reduce((sum, ing) => sum + ing.costo, 0);
  }, [formData.ingredienti]);

  const prezzoVendita = parseFloat(formData.prezzoVendita) || 0;
  const utile = prezzoVendita - foodCost;
  const marginalita = prezzoVendita > 0 ? (utile / prezzoVendita) * 100 : 0;

  // Get available units based on raw material
  const getAvailableUnits = (
    rawMaterial: RawMaterial | undefined
  ): string[] => {
    if (!rawMaterial) return ['KG', 'GR', 'LT', 'ML', 'PZ'];
    switch (rawMaterial.unitaMisura) {
      case 'KG':
        return ['KG', 'GR'];
      case 'LT':
        return ['LT', 'ML'];
      case 'PZ':
        return ['PZ'];
      default:
        return ['KG', 'GR'];
    }
  };

  // Convert unit and calculate cost
  const calculateCost = (
    rawMaterial: RawMaterial,
    unitaMisura: string,
    peso: number
  ): number => {
    let weightInBaseUnit = peso;

    // Convert to base unit
    if (rawMaterial.unitaMisura === 'KG') {
      if (unitaMisura === 'GR') {
        weightInBaseUnit = peso / 1000;
      }
    } else if (rawMaterial.unitaMisura === 'LT') {
      if (unitaMisura === 'ML') {
        weightInBaseUnit = peso / 1000;
      }
    }

    return weightInBaseUnit * rawMaterial.prezzoAcquisto;
  };

  const handleAddIngredient = () => {
    const rawMaterial = rawMaterials.find(
      rm => rm.codice === ingredientForm.codMateria
    );

    if (!rawMaterial) {
      alert('Materia prima non trovata');
      return;
    }

    const costo = calculateCost(
      rawMaterial,
      ingredientForm.unitaMisura,
      parseFloat(ingredientForm.peso) || 0
    );

    const newIngredient: RecipeIngredient = {
      id: Date.now().toString(),
      codMateria: ingredientForm.codMateria,
      materiaPrima: rawMaterial.materiaPrima,
      unitaMisura: ingredientForm.unitaMisura as any,
      peso: parseFloat(ingredientForm.peso) || 0,
      costo,
    };

    if (editingIngredientIndex !== null) {
      const updated = [...formData.ingredienti];
      updated[editingIngredientIndex] = newIngredient;
      setFormData({ ...formData, ingredienti: updated });
    } else {
      setFormData({
        ...formData,
        ingredienti: [...formData.ingredienti, newIngredient],
      });
    }

    setShowIngredientModal(false);
    setEditingIngredientIndex(null);
    setIngredientForm({
      codMateria: '',
      materiaPrima: '',
      unitaMisura: 'KG',
      peso: '',
    });
  };

  const handleDeleteIngredient = (index: number) => {
    const updated = formData.ingredienti.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredienti: updated });
  };

  const handleSave = () => {
    if (
      !formData.nomePiatto ||
      !formData.prezzoVendita ||
      formData.ingredienti.length === 0
    ) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    onSave({
      nomePiatto: formData.nomePiatto,
      categoria: formData.categoria,
      prezzoVendita: parseFloat(formData.prezzoVendita),
      ingredienti: formData.ingredienti,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            {recipe ? 'Modifica Ricetta' : 'Nuova Ricetta'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Piatto *
              </label>
              <input
                type="text"
                value={formData.nomePiatto}
                onChange={e =>
                  setFormData({ ...formData, nomePiatto: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prezzo di Vendita (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.prezzoVendita}
                onChange={e =>
                  setFormData({ ...formData, prezzoVendita: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Ingredients List */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
              <label className="block text-sm font-medium text-gray-700">
                Ingredienti *
              </label>
              <button
                onClick={() => {
                  setEditingIngredientIndex(null);
                  setIngredientForm({
                    codMateria: '',
                    materiaPrima: '',
                    unitaMisura: 'KG',
                    peso: '',
                  });
                  setShowIngredientModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-600 w-full sm:w-auto justify-center"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="whitespace-nowrap">Aggiungi Ingrediente</span>
              </button>
            </div>

            {formData.ingredienti.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                Nessun ingrediente aggiunto
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Cod.
                      </th>
                      <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Materia Prima
                      </th>
                      <th className="px-2 md:px-3 py-2 text-right text-xs font-medium text-gray-500">
                        UM
                      </th>
                      <th className="px-2 md:px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Peso
                      </th>
                      <th className="px-2 md:px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Costo
                      </th>
                      <th className="px-2 md:px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.ingredienti.map((ing, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 md:px-3 py-2 text-xs md:text-sm text-gray-900">
                          {ing.codMateria}
                        </td>
                        <td className="px-2 md:px-3 py-2 text-xs md:text-sm text-gray-700">
                          {ing.materiaPrima}
                        </td>
                        <td className="px-2 md:px-3 py-2 text-xs md:text-sm text-right text-gray-600">
                          {ing.unitaMisura}
                        </td>
                        <td className="px-2 md:px-3 py-2 text-xs md:text-sm text-right text-gray-700">
                          {ing.peso.toFixed(2)}
                        </td>
                        <td className="px-2 md:px-3 py-2 text-xs md:text-sm text-right font-medium text-gray-900">
                          €{ing.costo.toFixed(2)}
                        </td>
                        <td className="px-2 md:px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setIngredientForm({
                                  codMateria: ing.codMateria,
                                  materiaPrima: ing.materiaPrima,
                                  unitaMisura: ing.unitaMisura,
                                  peso: ing.peso.toString(),
                                });
                                setEditingIngredientIndex(idx);
                                setShowIngredientModal(true);
                              }}
                              className="text-primary hover:text-primary-600 p-1"
                              title="Modifica"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteIngredient(idx)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Elimina"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-2 md:px-3 py-2 text-xs md:text-sm font-bold text-gray-700"
                      >
                        FOOD COST DEL PIATTO
                      </td>
                      <td className="px-2 md:px-3 py-2 text-xs md:text-sm font-bold text-right text-primary-600">
                        €{foodCost.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
              <div>
                <span className="text-gray-600">Food Cost:</span>
                <span className="ml-2 font-bold text-gray-900">
                  €{foodCost.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Utile:</span>
                <span className="ml-2 font-bold text-green-700">
                  €{utile.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Marginalità:</span>
                <span className="ml-2 font-bold text-green-700">
                  {marginalita.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm md:text-base"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm md:text-base font-medium"
          >
            Salva
          </button>
        </div>
      </div>

      {/* Ingredient Modal */}
      {showIngredientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[60] p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-bold mb-4">Aggiungi Ingrediente</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Materia Prima *
                </label>
                <SearchableSelect
                  value={
                    ingredientForm.codMateria
                      ? rawMaterials.find(
                          rm => rm.codice === ingredientForm.codMateria
                        )?.materiaPrima || ''
                      : ''
                  }
                  onChange={value => {
                    // Find raw material by materiaPrima (first match)
                    const selectedRawMaterial = rawMaterials.find(
                      rm => rm.materiaPrima === value
                    );
                    if (selectedRawMaterial) {
                      const availableUnits =
                        getAvailableUnits(selectedRawMaterial);
                      setIngredientForm({
                        codMateria: selectedRawMaterial.codice,
                        materiaPrima: selectedRawMaterial.materiaPrima,
                        unitaMisura: availableUnits[0] as any,
                        peso: ingredientForm.peso,
                      });
                    }
                  }}
                  options={Array.from(
                    new Set(rawMaterials.map(rm => rm.materiaPrima))
                  )
                    .filter((v): v is string => typeof v === 'string')
                    .sort((a, b) =>
                      a.localeCompare(b, 'it', { sensitivity: 'base' })
                    )}
                  placeholder="Cerca materia prima..."
                  emptyOption="Seleziona..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unità di Misura *
                </label>
                <select
                  value={ingredientForm.unitaMisura}
                  onChange={e =>
                    setIngredientForm({
                      ...ingredientForm,
                      unitaMisura: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {getAvailableUnits(
                    rawMaterials.find(
                      rm => rm.codice === ingredientForm.codMateria
                    )
                  ).map(um => (
                    <option key={um} value={um}>
                      {um}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ingredientForm.peso}
                  onChange={e =>
                    setIngredientForm({
                      ...ingredientForm,
                      peso: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowIngredientModal(false);
                  setEditingIngredientIndex(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleAddIngredient}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600"
              >
                {editingIngredientIndex !== null ? 'Aggiorna' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ricette;
