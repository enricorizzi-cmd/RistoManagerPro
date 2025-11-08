import { API_BASE_URL } from '../src/config/api';

// Helper function to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  locationId: string,
  options: globalThis.RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

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

// File upload helper
async function uploadFile(
  endpoint: string,
  locationId: string,
  file: File,
  additionalData?: Record<string, any>
): Promise<any> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    'X-Location-Id': locationId,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Upload failed: ${response.status}`);
  }

  return response.json();
}

// Types
export interface SalesImport {
  id: string;
  location_id: string;
  import_date: string;
  period_month: number;
  period_year: number;
  file_name: string;
  total_categories: number;
  total_dishes: number;
  total_quantity: number;
  total_value: number;
  status: 'completed' | 'partial' | 'failed' | 'processing';
  created_at: string;
}

export interface SalesDish {
  id: string;
  dish_name: string;
  dish_name_original: string;
  category_gestionale?: string;
  recipe_id?: string | null;
  is_linked: boolean;
  match_confidence?: number | null;
  match_method?: 'exact' | 'fuzzy' | 'manual' | 'suggested' | null;
  total_imports: number;
  total_quantity_sold: number;
  total_value_generated: number;
  last_seen_date: string;
}

export interface ImportPreview {
  preview: {
    fileName: string;
    fileSize: number;
    sheets: Array<{ name: string; rowCount: number }>;
    summaryTable: {
      rows: Array<{ category: string; quantity: number; totalValue: number }>;
      totalRows: number;
    };
    detailTable: {
      rows: Array<{
        dishName: string;
        category: string;
        quantity: number;
        totalValue: number;
        unitPrice?: number;
      }>;
      totalRows: number;
      sampleRows: Array<any>;
    };
  };
  validation: {
    isValid: boolean;
    errors: Array<{
      type: string;
      message: string;
      row?: number;
      severity: 'error' | 'warning';
    }>;
    warnings: Array<any>;
  };
}

export interface ImportResult {
  success: boolean;
  importId: string;
  stats: {
    categoriesImported: number;
    dishesImported: number;
    dishesNew: number;
    dishesExisting: number;
    dishesMatched: number;
    dishesUnmatched: number;
    totalQuantity: number;
    totalValue: number;
  };
  matches: Array<{
    dishId: string;
    dishName: string;
    recipeId: string | null;
    recipeName: string | null;
    confidence: number;
    method: string | null;
  }>;
  errors: Array<any>;
  warnings: Array<any>;
}

export interface DashboardData {
  kpis: {
    totalValue: number;
    totalQuantity: number;
    uniqueDishes: number;
    averageTicket: number;
    linkedDishesCount: number;
    unlinkedDishesCount: number;
    trends: {
      value: { change: number; trend: 'up' | 'down' | 'stable' };
      quantity: { change: number; trend: 'up' | 'down' | 'stable' };
      uniqueDishes: { change: number; trend: 'up' | 'down' | 'stable' };
      averageTicket: { change: number; trend: 'up' | 'down' | 'stable' };
    };
  };
  charts: {
    salesTrend: Array<{
      date: string;
      total: number;
      linked: number;
      unlinked: number;
    }>;
    categoryDistribution: Array<{
      category: string;
      quantity: number;
      value: number;
      percentage: number;
    }>;
    topDishes: Array<{
      dishId: string;
      dishName: string;
      quantity: number;
      value: number;
      isLinked: boolean;
      recipeId?: string | null;
    }>;
  };
}

// Upload and preview Excel file
export const uploadPreview = (
  locationId: string,
  file: File
): Promise<ImportPreview> => {
  return uploadFile('/api/sales-analysis/upload-preview', locationId, file);
};

// Import sales data
export const importSalesData = (
  locationId: string,
  file: File,
  periodMonth: number,
  periodYear: number,
  overwriteExisting?: boolean
): Promise<ImportResult> => {
  return uploadFile('/api/sales-analysis/import', locationId, file, {
    periodMonth,
    periodYear,
    overwriteExisting: overwriteExisting ? 'true' : 'false',
  });
};

// Get imports list
export const getImports = (
  locationId: string
): Promise<{ imports: SalesImport[]; total: number }> => {
  return apiCall<{ imports: SalesImport[]; total: number }>(
    '/api/sales-analysis/imports',
    locationId
  );
};

// Get dishes list
export const getDishes = (
  locationId: string,
  options?: {
    linked?: boolean;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  dishes: SalesDish[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> => {
  const params = new URLSearchParams();
  if (options?.linked !== undefined) {
    params.append('linked', options.linked.toString());
  }
  if (options?.category) {
    params.append('category', options.category);
  }
  if (options?.search) {
    params.append('search', options.search);
  }
  if (options?.limit) {
    params.append('limit', options.limit.toString());
  }
  if (options?.offset) {
    params.append('offset', options.offset.toString());
  }

  const queryString = params.toString();
  return apiCall(
    `/api/sales-analysis/dishes${queryString ? `?${queryString}` : ''}`,
    locationId
  );
};

// Link dish to recipe
export const linkDish = (
  locationId: string,
  dishId: string,
  recipeId: string | null
): Promise<{ success: boolean; dish: SalesDish }> => {
  return apiCall(`/api/sales-analysis/dishes/${dishId}/link`, locationId, {
    method: 'PUT',
    body: JSON.stringify({ recipeId }),
  });
};

// Batch link dishes
export const batchLinkDishes = (
  locationId: string,
  links: Array<{ dishId: string; recipeId: string | null }>
): Promise<{ success: boolean; linked: number; errors: Array<any> }> => {
  return apiCall('/api/sales-analysis/dishes/batch-link', locationId, {
    method: 'POST',
    body: JSON.stringify({ links }),
  });
};

// Get dashboard data
export const getDashboardData = (
  locationId: string,
  options?: {
    granularity?: 'mese' | 'trimestre' | 'quadrimestre' | 'semestre' | 'anno' | 'totale';
    periodMonth?: number;
    periodYear?: number;
    category?: string;
    recipeId?: string;
    compareWithPrevious?: boolean;
  }
): Promise<DashboardData> => {
  const params = new URLSearchParams();
  if (options?.granularity) {
    params.append('granularity', options.granularity);
  }
  if (options?.periodMonth) {
    params.append('periodMonth', options.periodMonth.toString());
  }
  if (options?.periodYear) {
    params.append('periodYear', options.periodYear.toString());
  }
  if (options?.category) {
    params.append('category', options.category);
  }
  if (options?.recipeId) {
    params.append('recipeId', options.recipeId);
  }
  if (options?.compareWithPrevious) {
    params.append('compareWithPrevious', 'true');
  }

  const queryString = params.toString();
  return apiCall(
    `/api/sales-analysis/dashboard${queryString ? `?${queryString}` : ''}`,
    locationId
  );
};

