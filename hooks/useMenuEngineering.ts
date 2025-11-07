import { useState, useEffect, useCallback } from 'react';
import {
  getRawMaterials,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeSales,
  type RawMaterial as ApiRawMaterial,
  type Recipe as ApiRecipe,
  type RecipeSale,
} from '../services/menuEngineeringApi';
import type {
  RawMaterial,
  Recipe,
  RecipeSales,
} from '../components/menu-engineering/types';
import { useAppContext } from '../contexts/AppContext';

// Convert API format (snake_case) to component format (camelCase)
function convertRawMaterial(api: ApiRawMaterial): RawMaterial {
  return {
    id: api.id,
    tipologia: api.tipologia,
    categoria: api.categoria,
    codice: api.codice,
    materiaPrima: api.materia_prima,
    unitaMisura: api.unita_misura,
    fornitore: api.fornitore,
    prezzoAcquisto: parseFloat(api.prezzo_acquisto.toString()),
    dataUltimoAcquisto: api.data_ultimo_acquisto,
  };
}

function convertRecipe(api: ApiRecipe): Recipe {
  return {
    id: api.id,
    nomePiatto: api.nome_piatto,
    categoria: api.categoria,
    prezzoVendita: parseFloat(api.prezzo_vendita.toString()),
    ingredienti: api.ingredienti.map(ing => ({
      id: ing.id,
      codMateria: ing.cod_materia,
      materiaPrima: ing.materia_prima,
      unitaMisura: ing.unita_misura,
      peso: parseFloat(ing.peso.toString()),
      costo: parseFloat(ing.costo.toString()),
    })),
    foodCost: parseFloat(api.food_cost.toString()),
    utile: parseFloat(api.utile.toString()),
    marginalita: parseFloat(api.marginalita.toString()),
    order: api.order,
  };
}

function convertRecipeSale(api: RecipeSale): RecipeSales {
  return {
    recipeId: api.recipe_id,
    quantity: api.quantity,
    date: api.sale_date,
  };
}

export function useMenuEngineering() {
  const { currentLocation, loading: appLoading } = useAppContext();
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeSales, setRecipeSales] = useState<RecipeSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set loading to false if app is still loading or location is not set
  useEffect(() => {
    if (appLoading || !currentLocation?.id) {
      setLoading(true);
    }
  }, [appLoading, currentLocation?.id]);

  // Load all data
  const loadData = useCallback(async () => {
    // Don't load data if app is still loading or location is not set
    if (appLoading || !currentLocation?.id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const locationId = currentLocation.id;
      const [materialsData, recipesData, salesData] = await Promise.all([
        getRawMaterials(locationId),
        getRecipes(locationId),
        getRecipeSales(locationId),
      ]);

      setRawMaterials(materialsData.map(convertRawMaterial));
      setRecipes(recipesData.map(convertRecipe));
      setRecipeSales(salesData.map(convertRecipeSale));
    } catch (err) {
      console.error('Failed to load menu engineering data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentLocation?.id, appLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Raw Materials handlers
  const handleAddRawMaterial = useCallback(
    async (material: Omit<RawMaterial, 'id'>) => {
      if (!currentLocation?.id) {
        throw new Error('Location ID is required');
      }
      try {
        const created = await createRawMaterial(currentLocation.id, {
          tipologia: material.tipologia,
          categoria: material.categoria,
          codice: material.codice,
          materia_prima: material.materiaPrima,
          unita_misura: material.unitaMisura,
          fornitore: material.fornitore,
          prezzo_acquisto: material.prezzoAcquisto,
          data_ultimo_acquisto: material.dataUltimoAcquisto,
        });
        setRawMaterials(prev => [...prev, convertRawMaterial(created)]);
        return created.id;
      } catch (err) {
        console.error('Failed to create raw material:', err);
        throw err;
      }
    },
    [currentLocation?.id]
  );

  const handleUpdateRawMaterial = useCallback(
    async (id: string, material: Omit<RawMaterial, 'id'>) => {
      if (!currentLocation?.id) {
        throw new Error('Location ID is required');
      }
      try {
        const updated = await updateRawMaterial(currentLocation.id, id, {
          tipologia: material.tipologia,
          categoria: material.categoria,
          codice: material.codice,
          materia_prima: material.materiaPrima,
          unita_misura: material.unitaMisura,
          fornitore: material.fornitore,
          prezzo_acquisto: material.prezzoAcquisto,
          data_ultimo_acquisto: material.dataUltimoAcquisto,
        });
        setRawMaterials(prev =>
          prev.map(m => (m.id === id ? convertRawMaterial(updated) : m))
        );
      } catch (err) {
        console.error('Failed to update raw material:', err);
        throw err;
      }
    },
    [currentLocation?.id]
  );

  const handleDeleteRawMaterial = useCallback(
    async (id: string) => {
      if (!currentLocation?.id) {
        throw new Error('Location ID is required');
      }
      try {
        await deleteRawMaterial(currentLocation.id, id);
        setRawMaterials(prev => prev.filter(m => m.id !== id));
      } catch (err) {
        console.error('Failed to delete raw material:', err);
        throw err;
      }
    },
    [currentLocation?.id]
  );

  // Recipes handlers
  const handleAddRecipe = useCallback(
    async (
      recipeData: Omit<Recipe, 'id' | 'foodCost' | 'utile' | 'marginalita'>
    ) => {
      if (!currentLocation?.id) {
        throw new Error('Location ID is required');
      }
      try {
        const created = await createRecipe(currentLocation.id, {
          nome_piatto: recipeData.nomePiatto,
          categoria: recipeData.categoria as
            | 'antipasti'
            | 'primi'
            | 'secondi'
            | 'dessert'
            | 'altro',
          prezzo_vendita: recipeData.prezzoVendita,
          ingredienti: recipeData.ingredienti.map(ing => ({
            id: '',
            recipe_id: '',
            cod_materia: ing.codMateria,
            materia_prima: ing.materiaPrima,
            unita_misura: ing.unitaMisura,
            peso: ing.peso,
            costo: ing.costo,
          })),
          order: recipeData.order,
        });
        setRecipes(prev => [...prev, convertRecipe(created)]);
        return created.id;
      } catch (err) {
        console.error('Failed to create recipe:', err);
        throw err;
      }
    },
    [currentLocation?.id]
  );

  const handleUpdateRecipe = useCallback(
    async (id: string, recipeData: Partial<Recipe>) => {
      if (!currentLocation?.id) {
        throw new Error('Location ID is required');
      }
      try {
        const updated = await updateRecipe(currentLocation.id, id, {
          nome_piatto: recipeData.nomePiatto,
          categoria: recipeData.categoria as
            | 'antipasti'
            | 'primi'
            | 'secondi'
            | 'dessert'
            | 'altro'
            | undefined,
          prezzo_vendita: recipeData.prezzoVendita,
          ingredienti: recipeData.ingredienti?.map(ing => ({
            id: ing.id,
            recipe_id: id,
            cod_materia: ing.codMateria,
            materia_prima: ing.materiaPrima,
            unita_misura: ing.unitaMisura,
            peso: ing.peso,
            costo: ing.costo,
          })),
          order: recipeData.order,
        });
        setRecipes(prev =>
          prev.map(r => (r.id === id ? convertRecipe(updated) : r))
        );
      } catch (err) {
        console.error('Failed to update recipe:', err);
        throw err;
      }
    },
    [currentLocation?.id]
  );

  const handleDeleteRecipe = useCallback(
    async (id: string) => {
      if (!currentLocation?.id) {
        throw new Error('Location ID is required');
      }
      try {
        await deleteRecipe(currentLocation.id, id);
        setRecipes(prev => prev.filter(r => r.id !== id));
      } catch (err) {
        console.error('Failed to delete recipe:', err);
        throw err;
      }
    },
    [currentLocation?.id]
  );

  const handleReorderRecipes = useCallback(
    async (recipeIds: string[]) => {
      if (!currentLocation?.id) {
        throw new Error('Location ID is required');
      }
      try {
        // Update order for each recipe
        const updates = recipeIds.map((id, index) =>
          updateRecipe(currentLocation.id, id, { order: index })
        );
        await Promise.all(updates);

        // Reload recipes to get updated order
        const recipesData = await getRecipes(currentLocation.id);
        setRecipes(recipesData.map(convertRecipe));
      } catch (err) {
        console.error('Failed to reorder recipes:', err);
        throw err;
      }
    },
    [currentLocation?.id]
  );

  return {
    rawMaterials,
    recipes,
    recipeSales,
    loading,
    error,
    loadData,
    handleAddRawMaterial,
    handleUpdateRawMaterial,
    handleDeleteRawMaterial,
    handleAddRecipe,
    handleUpdateRecipe,
    handleDeleteRecipe,
    handleReorderRecipes,
  };
}
