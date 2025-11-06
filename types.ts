// Financial Plan Types
export type TabKey = 'overview' | 'plan' | 'stats' | 'causali' | 'inserisci-dati' | 'business-plan' | 'analisi-fp';

export interface PlanOverrides {
  [macroCategory: string]: {
    [category: string]: {
      [detail: string]: {
        [monthKey: string]: number;
      };
    };
  };
}

export interface StatsOverrides {
  [key: string]: number;
}

export interface RestaurantLocation {
  id: string;
  name: string;
  capacity: number;
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
}

export type NotificationType = 'success' | 'info' | 'error';

export interface AppNotification {
    id: number;
    message: string;
    type: NotificationType;
}

export interface AppContextType {
    locations: RestaurantLocation[];
    currentLocation: RestaurantLocation | null;
    loading: boolean;
    error: string | null;
    notifications: AppNotification[];
    showNotification: (message: string, type: NotificationType) => void;
    setCurrentLocation: (locationId: string) => Promise<void>;
    updateLocationSettings: (locationId: string, newSettings: RestaurantLocation) => Promise<void>;
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
}