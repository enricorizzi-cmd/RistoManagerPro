import { Reservation, ReservationStatus, RestaurantLocation, WaitlistEntry, MenuItem, Sale, OrderItem, Table, TableStatus, Customer } from '../types';

const API_BASE_URL = 'http://localhost:4000/api';

// Helper function to make API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Locations
export const getLocations = (): Promise<RestaurantLocation[]> => {
  return apiCall<RestaurantLocation[]>('/locations');
};

export const updateLocationSettings = (locationId: string, newSettings: RestaurantLocation): Promise<RestaurantLocation | undefined> => {
  return apiCall<RestaurantLocation>(`/locations/${locationId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: newSettings.name,
      capacity: newSettings.capacity,
      openTime: newSettings.openTime,
      closeTime: newSettings.closeTime,
    }),
  });
};

// Reservations
export const getReservations = (locationId: string): Promise<Reservation[]> => {
  return apiCall<Reservation[]>(`/reservations/${locationId}`);
};

export const addReservation = (reservationData: Omit<Reservation, 'id' | 'locationId'>): Promise<Reservation> => {
  return apiCall<Reservation>('/reservations', {
    method: 'POST',
    body: JSON.stringify(reservationData),
  });
};

export const updateReservationStatus = (id: string, status: ReservationStatus): Promise<Reservation | undefined> => {
  return apiCall<Reservation>(`/reservations/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

// Waitlist
export const getWaitlist = (locationId: string): Promise<WaitlistEntry[]> => {
  return apiCall<WaitlistEntry[]>(`/waitlist/${locationId}`);
};

export const addWaitlistEntry = (entryData: Omit<WaitlistEntry, 'id' | 'createdAt'>): Promise<WaitlistEntry> => {
  return apiCall<WaitlistEntry>('/waitlist', {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
};

export const removeWaitlistEntry = (id: string): Promise<{ success: boolean }> => {
  return apiCall<{ success: boolean }>(`/waitlist/${id}`, {
    method: 'DELETE',
  });
};

// Menu & Sales
export const getMenuItems = (locationId: string): Promise<MenuItem[]> => {
  return apiCall<MenuItem[]>(`/menu-items/${locationId}`);
};

export const getSales = (locationId: string): Promise<Sale[]> => {
  return apiCall<Sale[]>(`/sales/${locationId}`);
};

// Tables
export const getTables = (locationId: string): Promise<Table[]> => {
  return apiCall<Table[]>(`/tables/${locationId}`);
};

export const updateTableStatus = (tableId: string, status: TableStatus): Promise<Table | undefined> => {
  return apiCall<Table>(`/tables/${tableId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

export const clearTable = (tableId: string): Promise<Table | undefined> => {
  return updateTableStatus(tableId, TableStatus.Cleaning);
};

export const saveTableLayout = (locationId: string, layoutTables: Table[]): Promise<Table[]> => {
  return apiCall<Table[]>(`/tables/${locationId}/layout`, {
    method: 'PUT',
    body: JSON.stringify({ tables: layoutTables }),
  });
};

export const assignReservationToTable = (reservationId: string, tableId: string): Promise<{reservation: Reservation, table: Table} | undefined> => {
  // This would need to be implemented in the backend
  // For now, we'll update the reservation with the table ID
  return updateReservationStatus(reservationId, ReservationStatus.Seated).then(reservation => {
    if (reservation) {
      return updateTableStatus(tableId, TableStatus.Occupied).then(table => {
        if (table) {
          return { reservation, table };
        }
        return undefined;
      });
    }
    return undefined;
  });
};

export const seatWalkIn = (
    locationId: string,
    walkinData: Omit<Reservation, 'id' | 'locationId' | 'status'>,
    tableId: string
): Promise<{ reservation: Reservation; table: Table } | undefined> => {
  // Create reservation and assign to table
  return addReservation({
    ...walkinData,
            locationId,
            status: ReservationStatus.Seated,
    tableId,
  }).then(reservation => {
    return updateTableStatus(tableId, TableStatus.Occupied).then(table => {
      if (table) {
        return { reservation, table };
      }
      return undefined;
    });
  });
};

// CRM - Derived from reservations and sales
export const getCustomers = (locationId: string): Promise<Customer[]> => {
  // This would need to be implemented in the backend
  // For now, we'll derive customers from reservations and sales
  return Promise.all([
    getReservations(locationId),
    getSales(locationId)
  ]).then(([reservations, sales]) => {
    const customersMap = new Map<string, Customer>();

    reservations.forEach(res => {
        if (!res.phone) return;

        let customer = customersMap.get(res.phone);
        if (!customer) {
            customer = {
                id: res.phone,
                phone: res.phone,
                name: res.guestName,
                email: res.email,
                firstSeen: res.reservationTime,
                lastSeen: res.reservationTime,
                totalVisits: 0,
                totalSpent: 0,
                reservationHistory: [],
            };
        }

        // Update stats
        customer.totalVisits += 1;
        if (new Date(res.reservationTime) < new Date(customer.firstSeen)) {
            customer.firstSeen = res.reservationTime;
        }
        if (new Date(res.reservationTime) > new Date(customer.lastSeen)) {
            customer.lastSeen = res.reservationTime;
            customer.name = res.guestName;
            customer.email = res.email;
        }
        customer.reservationHistory.push(res);
        customersMap.set(res.phone, customer);
    });
    
    // Add sales data
    sales.forEach(sale => {
      const reservation = reservations.find(r => r.id === sale.reservationId);
      if (reservation && reservation.phone) {
           const customer = customersMap.get(reservation.phone);
        if (customer) {
               customer.totalSpent += sale.total;
           }
       }
    });

    const customers = Array.from(customersMap.values());
    customers.forEach(c => c.reservationHistory.sort((a,b) => new Date(b.reservationTime).getTime() - new Date(a.reservationTime).getTime()));
    
    return customers.sort((a,b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  });
};

// Initialize default data
export const initializeDefaultData = (): Promise<{ success: boolean; message: string }> => {
  return apiCall<{ success: boolean; message: string }>('/init-default-data', {
    method: 'POST',
  });
};