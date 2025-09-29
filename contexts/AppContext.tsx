import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Reservation, ReservationStatus, RestaurantLocation, KPIs, AppContextType, WaitlistEntry, Notification, NotificationType, MenuItem, Sale, Table, TableStatus, Customer } from '../types';
import * as api from '../services/apiService';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<RestaurantLocation[]>([]);
  const [currentLocation, setInternalCurrentLocation] = useState<RestaurantLocation | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ totalReservations: 0, totalCovers: 0, occupancyRate: 0, noShowRate: 0, reservationsByTime: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    const newNotification: Notification = {
      id: Date.now(),
      message,
      type,
    };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  const calculateKPIs = useCallback((res: Reservation[], loc: RestaurantLocation | null) => {
    if (!loc) return;
    const todayReservations = res.filter(r => new Date(r.reservationTime).toDateString() === new Date().toDateString());
    
    const totalReservations = todayReservations.length;
    const totalCovers = todayReservations.reduce((sum, r) => sum + r.partySize, 0);
    const noShows = todayReservations.filter(r => r.status === ReservationStatus.NoShow).length;
    const noShowRate = totalReservations > 0 ? (noShows / totalReservations) * 100 : 0;
    
    const seatedCovers = todayReservations
      .filter(r => r.status === ReservationStatus.Seated || r.status === ReservationStatus.Completed)
      .reduce((sum, r) => sum + r.partySize, 0);
    const occupancyRate = loc.capacity > 0 ? (seatedCovers / loc.capacity) * 100 : 0;

    const reservationsByTime: { [key: string]: number } = {};
    todayReservations.forEach(r => {
        const hour = new Date(r.reservationTime).getHours().toString().padStart(2, '0') + ':00';
        reservationsByTime[hour] = (reservationsByTime[hour] || 0) + 1;
    });

    const sortedReservationsByTime = Object.entries(reservationsByTime)
        .map(([time, reservations]) => ({ time, reservations }))
        .sort((a, b) => a.time.localeCompare(b.time));

    setKpis({ totalReservations, totalCovers, occupancyRate, noShowRate, reservationsByTime: sortedReservationsByTime });
  }, []);

  const fetchLocationData = useCallback(async (locationId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [resData, waitlistData, salesData, tablesData, customersData] = await Promise.all([
          api.getReservations(locationId),
          api.getWaitlist(locationId),
          api.getSales(locationId),
          api.getTables(locationId),
          api.getCustomers(locationId),
        ]);
      
      const location = locations.find(l => l.id === locationId) || currentLocation;
      setReservations(resData);
      setWaitlist(waitlistData);
      setSales(salesData);
      setTables(tablesData);
      setCustomers(customersData);
      calculateKPIs(resData, location);
    } catch (e) {
      setError('Recupero dati per la sede fallito.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [calculateKPIs, locations, currentLocation]);

  const setCurrentLocation = async (locationId: string) => {
    const newLocation = locations.find(l => l.id === locationId);
    if (newLocation) {
        setInternalCurrentLocation(newLocation);
        await fetchLocationData(locationId);
    }
  };
  
  useEffect(() => {
    const initializeApp = async () => {
        try {
            setLoading(true);
            setError(null);
            const locs = await api.getLocations();
            setLocations(locs);
            
            if (locs.length > 0) {
                const firstLocation = locs[0];
                setInternalCurrentLocation(firstLocation);
                const [resData, waitlistData, menuData, salesData, tablesData, customersData] = await Promise.all([
                    api.getReservations(firstLocation.id),
                    api.getWaitlist(firstLocation.id),
                    api.getMenuItems(),
                    api.getSales(firstLocation.id),
                    api.getTables(firstLocation.id),
                    api.getCustomers(firstLocation.id),
                ]);
                setReservations(resData);
                setWaitlist(waitlistData);
                setMenuItems(menuData);
                setSales(salesData);
                setTables(tablesData);
                setCustomers(customersData);
                calculateKPIs(resData, firstLocation);
            }
        } catch(e) {
            setError('Inizializzazione dei dati dell\'applicazione fallita.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    initializeApp();
  }, [calculateKPIs]);


  const addReservation = async (reservationData: Omit<Reservation, 'id' | 'locationId'>) => {
    if (!currentLocation) return;
    const fullReservationData = { ...reservationData, locationId: currentLocation.id };
    const newReservation = await api.addReservation(fullReservationData);
    const updatedReservations = [...reservations, newReservation].sort((a,b) => new Date(a.reservationTime).getTime() - new Date(b.reservationTime).getTime());
    setReservations(updatedReservations);
    calculateKPIs(updatedReservations, currentLocation);
  };

  const updateReservationStatus = async (id: string, status: ReservationStatus) => {
    const oldReservation = reservations.find(r => r.id === id);
    const updatedReservation = await api.updateReservationStatus(id, status);
    if (updatedReservation && currentLocation) {
      const updatedReservations = reservations.map(r => r.id === id ? updatedReservation : r);
      setReservations(updatedReservations);
      calculateKPIs(updatedReservations, currentLocation);
      
      if(oldReservation?.tableId || updatedReservation.tableId) {
          const freshTables = await api.getTables(currentLocation.id);
          setTables(freshTables);
      }
    }
  };

  const updateLocationSettings = async (locationId: string, newSettings: RestaurantLocation) => {
    const updatedLocation = await api.updateLocationSettings(locationId, newSettings);
    if (updatedLocation) {
        const updatedLocations = locations.map(l => l.id === locationId ? updatedLocation : l);
        setLocations(updatedLocations);
        if (currentLocation?.id === locationId) {
            setInternalCurrentLocation(updatedLocation);
        }
        showNotification('Impostazioni salvate con successo!', 'success');
    }
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    if (!currentLocation) return;
    const oldTable = tables.find(t => t.id === tableId);
    const updatedTable = await api.updateTableStatus(tableId, status);
    if (updatedTable) {
        setTables(tables.map(t => t.id === tableId ? updatedTable : t));
        showNotification(`Stato del tavolo ${updatedTable.name} aggiornato a ${status}.`, 'info');
        
        if(oldTable?.reservationId && (status === TableStatus.Available || status === TableStatus.Cleaning)) {
            const freshReservations = await api.getReservations(currentLocation.id);
            setReservations(freshReservations);
            calculateKPIs(freshReservations, currentLocation);
        }
    }
  };

   const clearTable = async (tableId: string) => {
    if (!currentLocation) return;
    const updatedTable = await api.clearTable(tableId);
    if (updatedTable) {
        showNotification(`Tavolo ${updatedTable.name} liberato.`, 'success');
        const [freshTables, freshReservations] = await Promise.all([
            api.getTables(currentLocation.id),
            api.getReservations(currentLocation.id)
        ]);
        setTables(freshTables);
        setReservations(freshReservations);
        calculateKPIs(freshReservations, currentLocation);
    }
  };

  const saveTableLayout = async (layoutTables: Table[]) => {
      if (!currentLocation) return;
      try {
        const savedTables = await api.saveTableLayout(currentLocation.id, layoutTables);
        setTables(savedTables);
        showNotification('Layout della planimetria salvato con successo!', 'success');
      } catch (e) {
        showNotification('Salvataggio del layout fallito.', 'error');
        console.error(e);
      }
  };

  const assignReservationToTable = async (reservationId: string, tableId: string) => {
    if(!currentLocation) return;
    const result = await api.assignReservationToTable(reservationId, tableId);
    if (result) {
        // Refetch both for simplicity and consistency
        const [freshReservations, freshTables] = await Promise.all([
            api.getReservations(currentLocation.id),
            api.getTables(currentLocation.id)
        ]);
        setReservations(freshReservations);
        setTables(freshTables);
        calculateKPIs(freshReservations, currentLocation);
        showNotification(`${result.reservation.guestName} assegnato al tavolo ${result.table.name}.`, 'success');
    }
  };

  const seatWalkIn = async (walkinData: Omit<Reservation, 'id' | 'locationId' | 'status'>, tableId: string) => {
      if (!currentLocation) return;
      const result = await api.seatWalkIn(currentLocation.id, walkinData, tableId);
      if (result) {
          const { reservation, table } = result;
          // Optimistically update state
          const updatedReservations = [...reservations, reservation].sort((a,b) => new Date(a.reservationTime).getTime() - new Date(b.reservationTime).getTime());
          setReservations(updatedReservations);
          setTables(prev => prev.map(t => t.id === table.id ? table : t));
          showNotification(`${reservation.guestName} accomodato al tavolo ${table.name}.`, 'success');
          // Recalculate KPIs with the new reservation
          calculateKPIs(updatedReservations, currentLocation);
      } else {
          showNotification('Errore: impossibile accomodare il cliente.', 'error');
      }
  };


  const addWaitlistEntry = async (entryData: Omit<WaitlistEntry, 'id' | 'createdAt' | 'locationId'>) => {
    if (!currentLocation) return;
    const fullEntryData = { ...entryData, locationId: currentLocation.id };
    const newEntry = await api.addWaitlistEntry(fullEntryData);
    setWaitlist([...waitlist, newEntry].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    showNotification(`${newEntry.guestName} aggiunto alla lista d'attesa.`, 'success');
  };

  const removeWaitlistEntry = async (id: string) => {
      await api.removeWaitlistEntry(id);
      setWaitlist(waitlist.filter(e => e.id !== id));
  };

  const seatFromWaitlist = async (id: string) => {
    if (!currentLocation) return;
    const entryToSeat = waitlist.find(e => e.id === id);
    if (!entryToSeat) return;

    const reservationData = {
        guestName: entryToSeat.guestName,
        partySize: entryToSeat.partySize,
        reservationTime: new Date().toISOString(),
        status: ReservationStatus.Seated,
        phone: entryToSeat.phone,
        email: '',
        notes: `Accomodato dalla lista d'attesa. Attesa stimata: ${entryToSeat.quotedWaitTime} min.`
    };
    
    await addReservation(reservationData);
    await removeWaitlistEntry(id);
    showNotification(`${entryToSeat.guestName} è stato accomodato.`, 'success');
  };

  const markWaitlistNoShow = async (id: string) => {
    const entry = waitlist.find(e => e.id === id);
    if (entry) {
        await removeWaitlistEntry(id);
        showNotification(`${entry.guestName} è stato segnato come assente.`, 'info');
    }
  };

  return (
    <AppContext.Provider value={{ locations, currentLocation, reservations, waitlist, tables, customers, kpis, menuItems, sales, loading, error, notifications, setCurrentLocation, addReservation, updateReservationStatus, updateLocationSettings, updateTableStatus, saveTableLayout, addWaitlistEntry, removeWaitlistEntry, seatFromWaitlist, markWaitlistNoShow, assignReservationToTable, seatWalkIn, clearTable }}>
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