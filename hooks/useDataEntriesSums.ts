// Hook for loading data entries sums for Piano Mensile
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

interface DataEntrySum {
  tipologia_causale: string;
  categoria: string;
  causale: string;
  anno: number;
  mese: number;
  total_value: number;
}

export const useDataEntriesSums = (locationId?: string) => {
  const [sums, setSums] = useState<DataEntrySum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const loadSums = async () => {
      if (!locationId || !token) {
        setSums([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/data-entries/${locationId}/sums`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSums(data);
        } else {
          setError('Failed to load data entries sums');
        }
      } catch (err) {
        setError('Error loading data entries sums');
        console.error('Error loading data entries sums:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSums();
  }, [locationId, token]);

  const getSumForCausale = (
    tipologia: string,
    categoria: string,
    causale: string,
    year: number,
    monthIndex: number
  ): number => {
    const sum = sums.find(
      s =>
        s.tipologia_causale === tipologia &&
        s.categoria === categoria &&
        s.causale === causale &&
        s.anno === year &&
        s.mese === monthIndex
    );
    return sum?.total_value || 0;
  };

  return {
    sums,
    loading,
    error,
    getSumForCausale,
  };
};
