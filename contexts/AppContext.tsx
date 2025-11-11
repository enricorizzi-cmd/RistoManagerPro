import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  RestaurantLocation,
  AppContextType,
  AppNotification,
  NotificationType,
} from '../types';
import { useAuth } from './AuthContext';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { token } = useAuth();
  const [locations, setLocations] = useState<RestaurantLocation[]>([]);
  const [currentLocation, setInternalCurrentLocation] =
    useState<RestaurantLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const showNotification = useCallback(
    (message: string, type: NotificationType) => {
      const newNotification: AppNotification = {
        id: Date.now(),
        message,
        type,
      };
      setNotifications(prev => [...prev, newNotification]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    },
    []
  );

  const setCurrentLocation = async (locationId: string) => {
    const newLocation = locations.find(l => l.id === locationId);
    if (newLocation) {
      setInternalCurrentLocation(newLocation);
    } else {
      // Handle virtual locations (like "all" for financial plan)
      // Create a virtual location object
      const virtualLocation: RestaurantLocation = {
        id: locationId,
        name: locationId === 'all' ? 'Tutti' : locationId,
        descrizione: 'Location virtuale per dati aggregati',
      };
      setInternalCurrentLocation(virtualLocation);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get user's accessible locations
        const apiBaseUrl =
          import.meta.env.VITE_API_BASE_URL ||
          (import.meta.env.PROD
            ? window.location.origin
            : 'http://localhost:4000');
        const response = await fetch(`${apiBaseUrl}/api/user/locations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user locations');
        }

        const locs = await response.json();
        setLocations(locs);

        if (locs.length > 0) {
          const firstLocation = locs[0];
          setInternalCurrentLocation(firstLocation);
        }
      } catch (e) {
        setError("Inizializzazione dei dati dell'applicazione fallita.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    initializeApp();
  }, [token]);

  const updateLocationSettings = async (
    locationId: string,
    newSettings: RestaurantLocation
  ) => {
    try {
      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL ||
        (import.meta.env.PROD
          ? window.location.origin
          : 'http://localhost:4000');
      const response = await fetch(
        `${apiBaseUrl}/api/locations/${locationId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newSettings.name,
            descrizione: newSettings.descrizione || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update location settings');
      }

      const updatedLocation = await response.json();
      const updatedLocations = locations.map(l =>
        l.id === locationId ? updatedLocation : l
      );
      setLocations(updatedLocations);
      if (currentLocation?.id === locationId) {
        setInternalCurrentLocation(updatedLocation);
      }
      showNotification('Impostazioni salvate con successo!', 'success');
    } catch (e) {
      showNotification('Errore nel salvataggio delle impostazioni.', 'error');
      console.error(e);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <AppContext.Provider
      value={{
        locations,
        currentLocation,
        loading,
        error,
        notifications,
        showNotification,
        setCurrentLocation,
        updateLocationSettings,
        sidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
