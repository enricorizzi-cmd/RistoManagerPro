// useAIInsights Hook - AI insights management
import { useState, useEffect } from 'react';
import {
  generateAIInsights,
  generateAIPredictions,
} from '../services/openaiService';
import type { AIInsight, AIPrediction } from '../types/dashboard.types';

export function useAIInsights(
  financialData: any,
  salesData: any,
  recipes: any[],
  enabled: boolean = true
) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [predictions, setPredictions] = useState<AIPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !financialData || financialData.length === 0) {
      return;
    }

    loadAIInsights();

    // Refresh every 5 minutes
    const interval = setInterval(loadAIInsights, 5 * 60 * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, financialData, salesData, recipes]);

  const loadAIInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const [newInsights, newPredictions] = await Promise.all([
        generateAIInsights(financialData, salesData, recipes),
        generateAIPredictions(financialData, salesData),
      ]);

      setInsights(newInsights);
      setPredictions(newPredictions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore nel caricamento insights AI'
      );
      console.error('AI insights loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    insights,
    predictions,
    loading,
    error,
    refetch: loadAIInsights,
  };
}
