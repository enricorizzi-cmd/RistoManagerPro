// useDashboardData Hook - Main hook for dashboard data management
import { useState, useEffect } from 'react';
import { useAppContext } from '../../../contexts/AppContext';
import { fetchDashboardData } from '../services/dashboardApi';
import type { DashboardData, PeriodFilter } from '../types/dashboard.types';

export function useDashboardData() {
  const { currentLocation } = useAppContext();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');

  useEffect(() => {
    if (!currentLocation?.id) {
      setLoading(false);
      return;
    }

    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation?.id, periodFilter]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    // Don't clear existing data while loading - keep it visible until new data arrives

    try {
      // Fetch dashboard data from API endpoint
      const data = await fetchDashboardData(currentLocation!.id, periodFilter);

      if (data) {
        setDashboardData(data);
      } else {
        // Only set empty data if we don't have existing data
        // This prevents clearing data when switching periods if API returns null
        if (!dashboardData) {
          setDashboardData({
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
          });
        }
        // If we have existing data and API returns null, keep existing data
        // This prevents clearing data when switching periods
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Errore nel caricamento dati'
      );
      console.error('Dashboard data loading error:', err);
      // Don't clear data on error - keep existing data visible
    } finally {
      setLoading(false);
    }
  };

  return {
    dashboardData,
    loading,
    error,
    periodFilter,
    setPeriodFilter,
    refetch: loadDashboardData,
  };
}
