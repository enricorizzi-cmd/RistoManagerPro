import { API_URL } from '../src/config/api';

const API_BASE_URL = API_URL;

// Helper function to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Helper function to get location ID
function getLocationId(): string | null {
  return localStorage.getItem('currentLocationId');
}

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  options: globalThis.RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const locationId = getLocationId();

  if (!token) {
    throw new Error('Authentication required');
  }

  if (!locationId) {
    throw new Error('Location ID is required');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Location-Id': locationId,
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API call failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      throw new Error(
        'Il server backend non è disponibile. Assicurati che il server sia avviato.'
      );
    }
    throw error;
  }
}

// Raw Materials API
export interface RawMaterial {
  id: string;
  location_id: string;
  tipologia: string;
  categoria: string;
  codice: string;
  materia_prima: string;
  unita_misura: 'KG' | 'LT' | 'PZ';
  fornitore: string;
  prezzo_acquisto: number;
  data_ultimo_acquisto: string;
  created_at?: string;
  updated_at?: string;
}

export const getRawMaterials = (): Promise<RawMaterial[]> => {
  return apiCall<RawMaterial[]>('/api/menu-engineering/raw-materials');
};

export const createRawMaterial = (
  material: Omit<
    RawMaterial,
    'id' | 'location_id' | 'created_at' | 'updated_at'
  >
): Promise<RawMaterial> => {
  return apiCall<RawMaterial>('/api/menu-engineering/raw-materials', {
    method: 'POST',
    body: JSON.stringify({
      tipologia: material.tipologia,
      categoria: material.categoria,
      codice: material.codice,
      materiaPrima: material.materia_prima,
      unitaMisura: material.unita_misura,
      fornitore: material.fornitore,
      prezzoAcquisto: material.prezzo_acquisto,
      dataUltimoAcquisto: material.data_ultimo_acquisto,
    }),
  });
};

export const updateRawMaterial = (
  id: string,
  material: Partial<
    Omit<RawMaterial, 'id' | 'location_id' | 'created_at' | 'updated_at'>
  >
): Promise<RawMaterial> => {
  return apiCall<RawMaterial>(`/api/menu-engineering/raw-materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      tipologia: material.tipologia,
      categoria: material.categoria,
      codice: material.codice,
      materiaPrima: material.materia_prima,
      unitaMisura: material.unita_misura,
      fornitore: material.fornitore,
      prezzoAcquisto: material.prezzo_acquisto,
      dataUltimoAcquisto: material.data_ultimo_acquisto,
    }),
  });
};

export const deleteRawMaterial = (
  id: string
): Promise<{ success: boolean }> => {
  return apiCall<{ success: boolean }>(
    `/api/menu-engineering/raw-materials/${id}`,
    {
      method: 'DELETE',
    }
  );
};

// Recipes API
export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  cod_materia: string;
  materia_prima: string;
  unita_misura: 'KG' | 'GR' | 'LT' | 'ML' | 'PZ';
  peso: number;
  costo: number;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id: string;
  location_id: string;
  nome_piatto: string;
  categoria: 'antipasti' | 'primi' | 'secondi' | 'dessert' | 'altro';
  prezzo_vendita: number;
  food_cost: number;
  utile: number;
  marginalita: number;
  order: number;
  ingredienti: RecipeIngredient[];
  created_at?: string;
  updated_at?: string;
}

export const getRecipes = (): Promise<Recipe[]> => {
  return apiCall<Recipe[]>('/api/menu-engineering/recipes');
};

export const createRecipe = (
  recipe: Omit<
    Recipe,
    | 'id'
    | 'location_id'
    | 'food_cost'
    | 'utile'
    | 'marginalita'
    | 'created_at'
    | 'updated_at'
  >
): Promise<Recipe> => {
  return apiCall<Recipe>('/api/menu-engineering/recipes', {
    method: 'POST',
    body: JSON.stringify({
      nomePiatto: recipe.nome_piatto,
      categoria: recipe.categoria,
      prezzoVendita: recipe.prezzo_vendita,
      ingredienti: recipe.ingredienti.map(ing => ({
        codMateria: ing.cod_materia,
        materiaPrima: ing.materia_prima,
        unitaMisura: ing.unita_misura,
        peso: ing.peso,
        costo: ing.costo,
      })),
      order: recipe.order,
    }),
  });
};

export const updateRecipe = (
  id: string,
  recipe: Partial<
    Omit<
      Recipe,
      | 'id'
      | 'location_id'
      | 'food_cost'
      | 'utile'
      | 'marginalita'
      | 'created_at'
      | 'updated_at'
    >
  >
): Promise<Recipe> => {
  return apiCall<Recipe>(`/api/menu-engineering/recipes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      nomePiatto: recipe.nome_piatto,
      categoria: recipe.categoria,
      prezzoVendita: recipe.prezzo_vendita,
      ingredienti: recipe.ingredienti?.map(ing => ({
        codMateria: ing.cod_materia,
        materiaPrima: ing.materia_prima,
        unitaMisura: ing.unita_misura,
        peso: ing.peso,
        costo: ing.costo,
      })),
      order: recipe.order,
    }),
  });
};

export const deleteRecipe = (id: string): Promise<{ success: boolean }> => {
  return apiCall<{ success: boolean }>(`/api/menu-engineering/recipes/${id}`, {
    method: 'DELETE',
  });
};

// Recipe Sales API
export interface RecipeSale {
  id: string;
  location_id: string;
  recipe_id: string;
  quantity: number;
  sale_date: string;
  created_at?: string;
  updated_at?: string;
}

export const getRecipeSales = (): Promise<RecipeSale[]> => {
  return apiCall<RecipeSale[]>('/api/menu-engineering/recipe-sales');
};

export const createRecipeSale = (
  sale: Omit<RecipeSale, 'id' | 'location_id' | 'created_at' | 'updated_at'>
): Promise<RecipeSale> => {
  return apiCall<RecipeSale>('/api/menu-engineering/recipe-sales', {
    method: 'POST',
    body: JSON.stringify({
      recipeId: sale.recipe_id,
      quantity: sale.quantity,
      saleDate: sale.sale_date,
    }),
  });
};
