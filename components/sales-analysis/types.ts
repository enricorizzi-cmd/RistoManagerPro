// Sales Analysis Types
// TypeScript interfaces for Sales Analysis feature

export type TimeGranularity =
  | 'mese'
  | 'trimestre'
  | 'quadrimestre'
  | 'semestre'
  | 'anno'
  | 'totale';

export interface PeriodFilter {
  granularity: TimeGranularity;
  month?: number; // 1-12 per mese
  quarter?: number; // 1-4 per trimestre
  quadrimestre?: number; // 1-3 per quadrimestre
  semester?: number; // 1-2 per semestre
  year: number; // Anno
}

export interface SalesImport {
  id: string;
  location_id: string;
  import_date: string;
  period_month: number;
  period_year: number;
  file_name: string;
  file_size_bytes?: number;
  file_hash?: string;
  total_categories: number;
  total_dishes: number;
  total_quantity: number;
  total_value: number;
  status: 'completed' | 'partial' | 'failed' | 'processing';
  error_count: number;
  warning_count: number;
  notes?: string;
  imported_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesCategory {
  id: string;
  location_id: string;
  import_id: string;
  category_name: string;
  category_name_normalized: string;
  quantity: number;
  total_value: number;
  created_at: string;
}

export interface SalesDish {
  id: string;
  location_id: string;
  dish_name: string;
  dish_name_original: string;
  dish_name_variants?: string[];
  category_gestionale?: string;
  recipe_id?: string | null;
  is_linked: boolean;
  match_confidence?: number | null;
  match_method?: 'exact' | 'fuzzy' | 'manual' | 'suggested' | null;
  first_seen_date: string;
  last_seen_date: string;
  total_imports: number;
  total_quantity_sold: number;
  total_value_generated: number;
  created_at: string;
  updated_at: string;
}

export interface SalesDishData {
  id: string;
  location_id: string;
  import_id: string;
  dish_id: string;
  recipe_id?: string | null;
  quantity: number;
  total_value: number;
  unit_price: number;
  period_month: number;
  period_year: number;
  created_at: string;
}

export interface CategorySummary {
  category: string;
  quantity: number;
  totalValue: number;
}

export interface DishDetail {
  dishName: string;
  category: string;
  quantity: number;
  totalValue: number;
  unitPrice?: number;
}

export interface ExcelParseResult {
  summaryTable: CategorySummary[];
  detailTable: DishDetail[];
  metadata: {
    fileName: string;
    fileSize: number;
    lastModified: Date;
    sheetNames: string[];
    detectedFormat: 'xls' | 'xlsx' | 'xlt';
  };
}

export interface ValidationError {
  type: string;
  message: string;
  row?: number;
  column?: string;
  severity: 'error' | 'warning';
  autoFix?: {
    suggestedValue: any;
    confidence: number;
  };
}

export interface MatchingResult {
  dishId: string;
  dishName: string;
  recipeId: string | null;
  recipeName: string | null;
  confidence: number;
  method: 'exact' | 'fuzzy' | 'keyword' | 'manual' | 'existing' | null;
  reasons: string[];
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
  matches: MatchingResult[];
  errors: Array<{
    type: string;
    message: string;
    row?: number;
  }>;
  warnings: Array<{
    type: string;
    message: string;
  }>;
}

export interface DashboardKPIs {
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
  comparison?: {
    previousPeriod: {
      totalValue: number;
      totalQuantity: number;
      uniqueDishes: number;
      averageTicket: number;
    };
    changes: {
      value: number;
      quantity: number;
      uniqueDishes: number;
      averageTicket: number;
    };
  };
}

export interface SalesTrendData {
  date: string;
  total: number;
  linked: number;
  unlinked: number;
}

export interface CategoryDistributionData {
  category: string;
  quantity: number;
  value: number;
  percentage: number;
}

export interface TopDishData {
  dishId: string;
  dishName: string;
  quantity: number;
  value: number;
  isLinked: boolean;
  recipeId?: string | null;
}

export interface ForecastData {
  historical: Array<{ date: string; value: number }>;
  predicted: Array<{
    date: string;
    value: number;
    lowerBound: number;
    upperBound: number;
  }>;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  charts: {
    salesTrend: SalesTrendData[];
    categoryDistribution: CategoryDistributionData[];
    topDishes: TopDishData[];
    forecast: ForecastData;
  };
  table: {
    dishes: Array<DishDetail & {
      dishId: string;
      percentage: number;
      trend?: number;
      isLinked: boolean;
      recipeId?: string | null;
    }>;
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

