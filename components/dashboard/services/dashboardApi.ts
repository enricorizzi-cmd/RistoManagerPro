// Dashboard API Service - API calls for dashboard data

import { API_BASE_URL } from '../../../src/config/api';
import type { DashboardData } from '../types/dashboard.types';

function buildUrl(path: string): string {
  const trimmed = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, '')}${trimmed}`;
}

function getAuthHeaders(): globalThis.HeadersInit {
  const token = localStorage.getItem('auth_token');
  const headers: globalThis.HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function fetchDashboardData(
  locationId: string,
  period: 'today' | 'week' | 'month' | 'year' | 'custom' = 'month'
): Promise<DashboardData | null> {
  try {
    const response = await fetch(
      buildUrl(`/api/dashboard?locationId=${locationId}&period=${period}`),
      {
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Return empty dashboard if not found
        return getEmptyDashboardData();
      }
      throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
    }

    const data = await response.json();
    return normalizeDashboardData(data);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return getEmptyDashboardData();
  }
}

function getEmptyDashboardData(): DashboardData {
  return {
    kpis: {
      fatturato: {
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        sparkline: [],
      },
      utile: {
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        sparkline: [],
      },
      vendite: {
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        sparkline: [],
      },
      margine: {
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        sparkline: [],
      },
    },
    financialData: [],
    bcgMatrix: [],
    salesAnalysis: {
      topDishes: [],
      categoryDistribution: [],
      ticketMedio: 0,
      totalVendite: 0,
      totalQuantity: 0,
    },
    aiInsights: [],
    aiPredictions: null,
    loading: false,
    error: null,
  };
}

function normalizeDashboardData(data: any): DashboardData {
  return {
    kpis: data.kpis || getEmptyDashboardData().kpis,
    financialData: data.financialData || [],
    bcgMatrix: data.bcgMatrix || [],
    salesAnalysis: data.salesAnalysis || getEmptyDashboardData().salesAnalysis,
    aiInsights: data.aiInsights || [],
    aiPredictions: data.aiPredictions || null,
    loading: false,
    error: null,
  };
}
