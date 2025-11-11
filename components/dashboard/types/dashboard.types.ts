// Dashboard Types - Complete TypeScript definitions

export type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DashboardKPIs {
  fatturato: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    sparkline: number[];
  };
  utile: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    sparkline: number[];
  };
  coperti?: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    sparkline: number[];
  };
  margine: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    sparkline: number[];
  };
}

export interface FinancialDataPoint {
  month: string;
  fatturato: number | null;
  fatturatoPrevisionale: number | null;
  incassato: number | null;
  incassatoPrevisionale: number | null;
  costiFissi: number | null;
  costiVariabili: number | null;
  utile: number | null;
  utilePrevisionale: number | null;
}

export interface BCGQuadrant {
  name: 'stars' | 'plowhorses' | 'puzzles' | 'dogs';
  label: string;
  color: string;
  recipes: BCGRecipe[];
}

export interface BCGRecipe {
  id: string;
  nome: string;
  popolarita: number; // % vendite
  marginalita: number; // % margine
  fatturato: number;
  categoria: string;
  prezzoVendita: number;
  foodCost: number;
}

export interface SalesAnalysisData {
  topDishes: {
    dishName: string;
    value: number;
    quantity: number;
    percentage: number;
    marginalita?: number;
    popolarita?: number;
    categoria?: string;
  }[];
  categoryDistribution: {
    category: string;
    value: number;
    quantity: number;
    percentage: number;
  }[];
  ticketMedio: number;
  totalVendite: number;
  totalQuantity: number;
  coperti?: number;
}

export interface AIInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'danger';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  recommendation: string;
  metrics?: Record<string, number>;
  timestamp: Date;
}

export interface AIPrediction {
  nextMonth: {
    fatturato: number;
    utile: number;
    vendite: number;
  };
  nextQuarter: {
    fatturato: number;
    utile: number;
    vendite: number;
  };
  confidence: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  financialData: FinancialDataPoint[];
  bcgMatrix: BCGRecipe[];
  salesAnalysis: SalesAnalysisData;
  aiInsights: AIInsight[];
  aiPredictions: AIPrediction | null;
  loading: boolean;
  error: string | null;
}

export interface ChartConfig {
  colors: {
    primary: string;
    success: string;
    danger: string;
    warning: string;
    info: string;
  };
  animations: boolean;
  responsive: boolean;
}
