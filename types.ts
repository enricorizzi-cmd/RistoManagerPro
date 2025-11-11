// Financial Plan Types
export type TabKey =
  | 'overview'
  | 'plan'
  | 'stats'
  | 'causali'
  | 'inserisci-dati'
  | 'business-plan'
  | 'analisi-fp';

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
  descrizione?: string | null;
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
  showNotification: (_message: string, _type: NotificationType) => void;
  setCurrentLocation: (_locationId: string) => Promise<void>;
  updateLocationSettings: (
    _locationId: string,
    _newSettings: RestaurantLocation
  ) => Promise<void>;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}
