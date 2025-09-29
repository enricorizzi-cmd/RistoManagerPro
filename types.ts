export enum ReservationStatus {
  Confirmed = 'Confermata',
  Seated = 'Accomodato',
  Completed = 'Completata',
  NoShow = 'Assente',
  Cancelled = 'Cancellata',
}

export enum TableStatus {
    Available = 'Disponibile',
    Occupied = 'Occupato',
    Reserved = 'Riservato',
    Cleaning = 'Da Pulire',
}

// Financial Plan Types
export type TabKey = 'plan' | 'stats' | 'causali' | 'inserisci-dati';

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

export interface Reservation {
  id: string;
  locationId: string;
  guestName: string;
  partySize: number;
  reservationTime: string;
  status: ReservationStatus;
  notes?: string;
  phone: string;
  email: string;
  tableId?: string | null;
}

export interface WaitlistEntry {
  id: string;
  locationId: string;
  guestName: string;
  partySize: number;
  phone: string;
  quotedWaitTime: number; // in minutes
  createdAt: string; // ISO string
}

export interface RestaurantLocation {
  id: string;
  name: string;
  capacity: number;
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
}

export interface Table {
    id: string;
    locationId: string;
    name: string;
    capacity: number;
    status: TableStatus;
    shape: 'square' | 'round';
    x: number;
    y: number;
    width: number;
    height: number;
    reservationId?: string | null;
}

export interface Customer {
    id: string; // Based on phone number
    name: string;
    phone: string;
    email: string;
    firstSeen: string;
    lastSeen: string;
    totalVisits: number;
    totalSpent: number;
    reservationHistory: Reservation[];
}


export interface KPIs {
  totalReservations: number;
  totalCovers: number;
  occupancyRate: number;
  noShowRate: number;
  reservationsByTime: { time: string; reservations: number }[];
}

export type NotificationType = 'success' | 'info' | 'error';

export interface AppNotification {
    id: number;
    message: string;
    type: NotificationType;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Antipasto' | 'Primo' | 'Secondo' | 'Dessert' | 'Bevanda';
  price: number;
  cost: number;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number; // Price at the time of order
}

export interface Sale {
  id: string;
  locationId: string;
  reservationId: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
}

export interface AppContextType {
    locations: RestaurantLocation[];
    currentLocation: RestaurantLocation | null;
    reservations: Reservation[];
    waitlist: WaitlistEntry[];
    tables: Table[];
    customers: Customer[];
    kpis: KPIs;
    menuItems: MenuItem[];
    sales: Sale[];
    loading: boolean;
    error: string | null;
    notifications: AppNotification[];
    showNotification: (message: string, type: NotificationType) => void;
    setCurrentLocation: (locationId: string) => Promise<void>;
    addReservation: (reservation: Omit<Reservation, 'id' | 'locationId'>) => Promise<void>;
    updateReservationStatus: (id: string, status: ReservationStatus) => Promise<void>;
    updateLocationSettings: (locationId: string, newSettings: RestaurantLocation) => Promise<void>;
    updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
    saveTableLayout: (tables: Table[]) => Promise<void>;
    addWaitlistEntry: (entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'locationId'>) => Promise<void>;
    removeWaitlistEntry: (id: string) => Promise<void>;
    seatFromWaitlist: (id: string) => Promise<void>;
    markWaitlistNoShow: (id: string) => Promise<void>;
    assignReservationToTable: (reservationId: string, tableId: string) => Promise<void>;
    seatWalkIn: (walkinData: Omit<Reservation, 'id' | 'locationId' | 'status'>, tableId: string) => Promise<void>;
    clearTable: (tableId: string) => Promise<void>;
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
}