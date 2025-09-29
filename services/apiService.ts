import { Reservation, ReservationStatus, RestaurantLocation, WaitlistEntry, MenuItem, Sale, OrderItem, Table, TableStatus, Customer } from '../types';

const mockLocations: RestaurantLocation[] = [
    { id: 'loc-1', name: 'Trattoria del Ponte', capacity: 50, openTime: '18:00', closeTime: '23:00' },
    { id: 'loc-2', name: 'Pizzeria al Forno', capacity: 80, openTime: '19:00', closeTime: '24:00' },
];

let mockReservations: Reservation[] = [
  { id: '1', locationId: 'loc-1', guestName: 'Alice Johnson', partySize: 2, reservationTime: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(), status: ReservationStatus.Completed, phone: '555-0101', email: 'alice@example.com', notes: 'Window seat requested.' },
  { id: '2', locationId: 'loc-1', guestName: 'Bob Williams', partySize: 4, reservationTime: new Date(new Date().setHours(19, 30, 0, 0)).toISOString(), status: ReservationStatus.Completed, phone: '555-0102', email: 'bob@example.com' },
  { id: '3', locationId: 'loc-1', guestName: 'Charlie Brown', partySize: 3, reservationTime: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(), status: ReservationStatus.Seated, phone: '555-0103', email: 'charlie@example.com', tableId: 't1-3' },
  { id: '4', locationId: 'loc-1', guestName: 'Diana Prince', partySize: 5, reservationTime: new Date(new Date().setHours(20, 15, 0, 0)).toISOString(), status: ReservationStatus.Confirmed, phone: '555-0104', email: 'diana@example.com', notes: 'Celebrating an anniversary.', tableId: 't1-5'},
  { id: '5', locationId: 'loc-2', guestName: 'Ethan Hunt', partySize: 2, reservationTime: new Date(new Date().setHours(21, 0, 0, 0)).toISOString(), status: ReservationStatus.Completed, phone: '555-0105', email: 'ethan@example.com' },
  { id: '6', locationId: 'loc-2', guestName: 'Fiona Glenanne', partySize: 6, reservationTime: new Date(new Date().setHours(18, 30, 0, 0)).toISOString(), status: ReservationStatus.Cancelled, phone: '555-0106', email: 'fiona@example.com' },
  { id: '7', locationId: 'loc-2', guestName: 'George Costanza', partySize: 1, reservationTime: new Date(new Date().setHours(19, 45, 0, 0)).toISOString(), status: ReservationStatus.NoShow, phone: '555-0107', email: 'george@example.com' },
  { id: '8', locationId: 'loc-2', guestName: 'Indiana Jones', partySize: 8, reservationTime: new Date(new Date().setHours(20, 30, 0, 0)).toISOString(), status: ReservationStatus.Confirmed, phone: '555-0110', email: 'indy@example.com' },
  { id: '9', locationId: 'loc-1', guestName: 'Alice Johnson', partySize: 2, reservationTime: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(), status: ReservationStatus.Completed, phone: '555-0101', email: 'alice@example.com' },
  { id: '10', locationId: 'loc-1', guestName: 'Charlie Brown', partySize: 2, reservationTime: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString(), status: ReservationStatus.Completed, phone: '555-0103', email: 'charlie@example.com' },
];

let mockWaitlist: WaitlistEntry[] = [
  { id: 'w1', locationId: 'loc-1', guestName: 'Harry Potter', partySize: 4, phone: '555-0108', quotedWaitTime: 15, createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 'w2', locationId: 'loc-2', guestName: 'Hermione Granger', partySize: 2, phone: '555-0109', quotedWaitTime: 20, createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
];

let mockTables: Table[] = [
    // Location 1
    { id: 't1-1', locationId: 'loc-1', name: 'T1', capacity: 2, status: TableStatus.Available, shape: 'round', x: 50, y: 50, width: 60, height: 60 },
    { id: 't1-2', locationId: 'loc-1', name: 'T2', capacity: 2, status: TableStatus.Available, shape: 'round', x: 50, y: 150, width: 60, height: 60 },
    { id: 't1-3', locationId: 'loc-1', name: 'B1', capacity: 4, status: TableStatus.Occupied, shape: 'square', x: 150, y: 50, width: 120, height: 70, reservationId: '3' },
    { id: 't1-4', locationId: 'loc-1', name: 'B2', capacity: 4, status: TableStatus.Available, shape: 'square', x: 150, y: 150, width: 120, height: 70 },
    { id: 't1-5', locationId: 'loc-1', name: 'C1', capacity: 6, status: TableStatus.Reserved, shape: 'square', x: 300, y: 100, width: 150, height: 80, reservationId: '4' },

    // Location 2
    { id: 't2-1', locationId: 'loc-2', name: 'P1', capacity: 4, status: TableStatus.Available, shape: 'square', x: 40, y: 40, width: 80, height: 80 },
    { id: 't2-2', locationId: 'loc-2', name: 'P2', capacity: 4, status: TableStatus.Available, shape: 'square', x: 150, y: 40, width: 80, height: 80 },
    { id: 't2-3', locationId: 'loc-2', name: 'P3', capacity: 4, status: TableStatus.Cleaning, shape: 'square', x: 260, y: 40, width: 80, height: 80 },
    { id: 't2-4', locationId: 'loc-2', name: 'P4', capacity: 2, status: TableStatus.Occupied, shape: 'round', x: 40, y: 150, width: 70, height: 70 },
    { id: 't2-5', locationId: 'loc-2', name: 'P5', capacity: 2, status: TableStatus.Available, shape: 'round', x: 120, y: 150, width: 70, height: 70 },
    { id: 't2-6', locationId: 'loc-2', name: 'P6', capacity: 8, status: TableStatus.Available, shape: 'square', x: 380, y: 80, width: 200, height: 90 },
];

const mockMenuItems: MenuItem[] = [
    { id: 'm1', name: 'Bruschetta al Pomodoro', category: 'Antipasto', price: 8, cost: 2.5 },
    { id: 'm2', name: 'Caprese Salad', category: 'Antipasto', price: 10, cost: 4 },
    { id: 'm3', name: 'Spaghetti Carbonara', category: 'Primo', price: 15, cost: 4.5 },
    { id: 'm4', name: 'Lasagna alla Bolognese', category: 'Primo', price: 16, cost: 5 },
    { id: 'm5', name: 'Risotto ai Funghi', category: 'Primo', price: 14, cost: 5.5 },
    { id: 'm6', name: 'Bistecca alla Fiorentina', category: 'Secondo', price: 35, cost: 15 },
    { id: 'm7', name: 'Pollo alla Cacciatora', category: 'Secondo', price: 20, cost: 7 },
    { id: 'm8', name: 'Tiramisù', category: 'Dessert', price: 9, cost: 3 },
    { id: 'm9', name: 'Panna Cotta', category: 'Dessert', price: 8, cost: 2.5 },
    { id: 'm10', name: 'Vino Rosso (calice)', category: 'Bevanda', price: 7, cost: 2 },
    { id: 'm11', name: 'Acqua Minerale', category: 'Bevanda', price: 3, cost: 0.5 },
];

const generateOrderItems = (): OrderItem[] => {
    const items: OrderItem[] = [];
    const numItems = Math.floor(Math.random() * 4) + 2; // 2-5 different items per order
    const shuffledMenu = [...mockMenuItems].sort(() => 0.5 - Math.random());
    for (let i = 0; i < numItems; i++) {
        const menuItem = shuffledMenu[i];
        if (menuItem) {
            items.push({
                menuItemId: menuItem.id,
                quantity: Math.floor(Math.random() * 2) + 1, // 1 or 2 of each item
                price: menuItem.price
            });
        }
    }
    return items;
};

let mockSales: Sale[] = mockReservations
    .filter(r => r.status === ReservationStatus.Completed)
    .map((r, index) => {
        const items = generateOrderItems();
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return {
            id: `s${index + 1}`,
            locationId: r.locationId,
            reservationId: r.id,
            items,
            total,
            createdAt: new Date(new Date(r.reservationTime).getTime() + 60 * 60 * 1000).toISOString() // 1 hour after reservation
        };
    });


const simulateDelay = <T,>(data: T): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(data), 500));
}

// Locations
export const getLocations = (): Promise<RestaurantLocation[]> => {
    return simulateDelay([...mockLocations]);
};

export const updateLocationSettings = (locationId: string, newSettings: RestaurantLocation): Promise<RestaurantLocation | undefined> => {
    const index = mockLocations.findIndex(l => l.id === locationId);
    if (index !== -1) {
        mockLocations[index] = { ...mockLocations[index], ...newSettings, id: locationId };
        return simulateDelay(mockLocations[index]);
    }
    return simulateDelay(undefined);
};

// Reservations
export const getReservations = (locationId: string): Promise<Reservation[]> => {
    const data = mockReservations.filter(r => r.locationId === locationId);
    return simulateDelay([...data].sort((a,b) => new Date(a.reservationTime).getTime() - new Date(b.reservationTime).getTime()));
};

export const addReservation = (reservationData: Omit<Reservation, 'id'>): Promise<Reservation> => {
    const newReservation: Reservation = {
        id: (Math.random() * 1000000).toString(),
        ...reservationData,
    };
    mockReservations.push(newReservation);
    return simulateDelay(newReservation);
};

export const updateReservationStatus = (id: string, status: ReservationStatus): Promise<Reservation | undefined> => {
    const index = mockReservations.findIndex(r => r.id === id);
    if (index !== -1) {
        mockReservations[index].status = status;
        const tableId = mockReservations[index].tableId;
        if (tableId) {
            const tableIndex = mockTables.findIndex(t => t.id === tableId);
            if(tableIndex !== -1) {
                if(status === ReservationStatus.Seated) {
                    mockTables[tableIndex].status = TableStatus.Occupied;
                } else if (status === ReservationStatus.Completed || status === ReservationStatus.NoShow) {
                    mockTables[tableIndex].status = TableStatus.Cleaning;
                    mockTables[tableIndex].reservationId = null;
                    mockReservations[index].tableId = null;
                } else if (status === ReservationStatus.Cancelled) {
                     mockTables[tableIndex].status = TableStatus.Available;
                     mockTables[tableIndex].reservationId = null;
                     mockReservations[index].tableId = null;
                }
            }
        }
        return simulateDelay(mockReservations[index]);
    }
    return simulateDelay(undefined);
};

// Waitlist
export const getWaitlist = (locationId: string): Promise<WaitlistEntry[]> => {
    const data = mockWaitlist.filter(e => e.locationId === locationId);
    return simulateDelay([...data].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
};

export const addWaitlistEntry = (entryData: Omit<WaitlistEntry, 'id' | 'createdAt'>): Promise<WaitlistEntry> => {
    const newEntry: WaitlistEntry = {
        id: 'w' + (Math.random() * 10000).toString(),
        createdAt: new Date().toISOString(),
        ...entryData,
    };
    mockWaitlist.push(newEntry);
    return simulateDelay(newEntry);
};

export const removeWaitlistEntry = (id: string): Promise<{ success: boolean }> => {
    const index = mockWaitlist.findIndex(e => e.id === id);
    if (index !== -1) {
        mockWaitlist.splice(index, 1);
        return simulateDelay({ success: true });
    }
    return simulateDelay({ success: false });
};

// Menu & Sales
export const getMenuItems = (): Promise<MenuItem[]> => {
    return simulateDelay([...mockMenuItems]);
};

export const getSales = (locationId: string): Promise<Sale[]> => {
    const data = mockSales.filter(s => s.locationId === locationId);
    return simulateDelay([...data]);
};

// Tables
export const getTables = (locationId: string): Promise<Table[]> => {
    const data = mockTables.filter(t => t.locationId === locationId);
    return simulateDelay([...data]);
};

export const updateTableStatus = (tableId: string, status: TableStatus): Promise<Table | undefined> => {
    const index = mockTables.findIndex(t => t.id === tableId);
    if (index !== -1) {
        const currentStatus = mockTables[index].status;
        if (currentStatus === status) return simulateDelay(mockTables[index]);
        
        mockTables[index].status = status;
        
        // If status becomes available or cleaning, clear assignments
        if (status === TableStatus.Available || status === TableStatus.Cleaning) {
            const resId = mockTables[index].reservationId;
            if (resId) {
                const resIndex = mockReservations.findIndex(r => r.id === resId);
                if (resIndex !== -1 && mockReservations[resIndex].status !== ReservationStatus.Completed && mockReservations[resIndex].status !== ReservationStatus.Cancelled) {
                     // This could be an issue - if we free a reserved table, the reservation should probably be unassigned but not cancelled.
                     // The current logic handles this by simply unlinking.
                     mockReservations[resIndex].tableId = null;
                }
            }
            mockTables[index].reservationId = null;
        }

        return simulateDelay(mockTables[index]);
    }
    return simulateDelay(undefined);
}

export const clearTable = (tableId: string): Promise<Table | undefined> => {
    const tableIndex = mockTables.findIndex(t => t.id === tableId);
    if (tableIndex !== -1) {
        const table = mockTables[tableIndex];
        const resId = table.reservationId;
        if (resId) {
            const resIndex = mockReservations.findIndex(r => r.id === resId);
            if (resIndex !== -1) {
                mockReservations[resIndex].status = ReservationStatus.Completed;
                mockReservations[resIndex].tableId = null;
            }
        }
        table.status = TableStatus.Cleaning;
        table.reservationId = null;
        return simulateDelay(table);
    }
    return simulateDelay(undefined);
};

export const saveTableLayout = (locationId: string, layoutTables: Table[]): Promise<Table[]> => {
    // Remove all old tables for the location
    const otherLocationTables = mockTables.filter(t => t.locationId !== locationId);
    mockTables = [...otherLocationTables, ...layoutTables];
    return simulateDelay(layoutTables);
};

export const assignReservationToTable = (reservationId: string, tableId:string): Promise<{reservation: Reservation, table: Table} | undefined> => {
    const resIndex = mockReservations.findIndex(r => r.id === reservationId);
    const tableIndex = mockTables.findIndex(t => t.id === tableId);

    if (resIndex !== -1 && tableIndex !== -1) {
        // Clear any old assignment for the table
        const oldResId = mockTables[tableIndex].reservationId;
        if(oldResId) {
            const oldResIndex = mockReservations.findIndex(r => r.id === oldResId);
            if(oldResIndex !== -1) {
                mockReservations[oldResIndex].tableId = null;
            }
        }
        
        // Clear any old assignment for the reservation
        const oldTableId = mockReservations[resIndex].tableId;
        if (oldTableId) {
            const oldTableIndex = mockTables.findIndex(t => t.id === oldTableId);
            if(oldTableIndex !== -1) {
                mockTables[oldTableIndex].reservationId = null;
                mockTables[oldTableIndex].status = TableStatus.Available;
            }
        }

        mockReservations[resIndex].tableId = tableId;
        mockTables[tableIndex].reservationId = reservationId;
        mockTables[tableIndex].status = TableStatus.Reserved;
        
        return simulateDelay({ reservation: mockReservations[resIndex], table: mockTables[tableIndex]});
    }
    return simulateDelay(undefined);
}

export const seatWalkIn = (
    locationId: string,
    walkinData: Omit<Reservation, 'id' | 'locationId' | 'status'>,
    tableId: string
): Promise<{ reservation: Reservation; table: Table } | undefined> => {
    const tableIndex = mockTables.findIndex(t => t.id === tableId && t.locationId === locationId);

    if (tableIndex !== -1 && mockTables[tableIndex].status === TableStatus.Available) {
        const newReservation: Reservation = {
            id: `res-${Date.now()}`,
            locationId,
            status: ReservationStatus.Seated,
            reservationTime: new Date().toISOString(),
            ...walkinData,
            tableId: tableId,
        };
        mockReservations.push(newReservation);

        mockTables[tableIndex].status = TableStatus.Occupied;
        mockTables[tableIndex].reservationId = newReservation.id;

        return simulateDelay({ reservation: newReservation, table: mockTables[tableIndex] });
    }

    return simulateDelay(undefined);
};


// CRM
export const getCustomers = (locationId: string): Promise<Customer[]> => {
    const locationReservations = mockReservations.filter(r => r.locationId === locationId);
    const locationSales = mockSales.filter(s => s.locationId === locationId);

    const customersMap = new Map<string, Customer>();

    locationReservations.forEach(res => {
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
            // Update name and email to the latest one
            customer.name = res.guestName;
            customer.email = res.email;
        }
        customer.reservationHistory.push(res);
        customersMap.set(res.phone, customer);
    });
    
    // Add sales data
    locationSales.forEach(sale => {
       const reservation = mockReservations.find(r => r.id === sale.reservationId);
       if(reservation && reservation.phone) {
           const customer = customersMap.get(reservation.phone);
           if(customer) {
               customer.totalSpent += sale.total;
           }
       }
    });

    const customers = Array.from(customersMap.values());
    customers.forEach(c => c.reservationHistory.sort((a,b) => new Date(b.reservationTime).getTime() - new Date(a.reservationTime).getTime()));
    
    return simulateDelay(customers.sort((a,b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()));
}