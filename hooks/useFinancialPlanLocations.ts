import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Location {
  id: string;
  name: string;
  status: string;
}

export const useFinancialPlanLocations = () => {
  const { token } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:4000/api/user/locations/financial-plan', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch financial plan locations');
        }

        const locs = await response.json();
        setLocations(locs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch locations');
        console.error('Error fetching financial plan locations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [token]);

  return { locations, loading, error };
};


