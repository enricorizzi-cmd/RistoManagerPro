import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Reservation, ReservationStatus, WaitlistEntry, TableStatus } from '../types';
import { format, formatDistanceToNow, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, isWithinInterval, isToday, isFuture } from 'date-fns';
import { it } from 'date-fns/locale';
import { UserGroupIcon, CalendarIcon, ClipboardListIcon, PlusIcon } from './icons/Icons';
import WaitlistModal from './WaitlistModal';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';


const getStatusChip = (status: ReservationStatus) => {
    const baseClasses = "px-2.5 py-1 text-xs font-semibold rounded-full leading-tight";
    switch (status) {
        case ReservationStatus.Confirmed:
            return `bg-blue-100 text-blue-800 ${baseClasses}`;
        case ReservationStatus.Seated:
            return `bg-green-100 text-green-800 ${baseClasses}`;
        case ReservationStatus.Completed:
            return `bg-gray-200 text-gray-800 ${baseClasses}`;
        case ReservationStatus.Cancelled:
            return `bg-yellow-100 text-yellow-800 ${baseClasses}`;
        default:
            return `bg-red-100 text-red-800 ${baseClasses}`;
    }
};

const ReservationTimelineRow: React.FC<{ reservation: Reservation }> = ({ reservation }) => (
    <div className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-b-0">
        <div className="flex-shrink-0 text-sm font-semibold text-gray-800 w-16 text-center">
            {format(new Date(reservation.reservationTime), 'p', { locale: it })}
        </div>
        <div className="flex-grow flex items-center">
            <div className="flex-shrink-0 h-9 w-9 flex items-center justify-center bg-gray-100 text-primary-700 rounded-full font-bold text-sm">
                {reservation.guestName.charAt(0)}
            </div>
            <div className="ml-3">
                <p className="text-sm font-semibold text-gray-900">{reservation.guestName}</p>
                <p className="text-xs text-gray-500 flex items-center">
                    <UserGroupIcon className="w-3.5 h-3.5 mr-1" />
                    {reservation.partySize} persone
                </p>
            </div>
        </div>
        <div className="flex-shrink-0">
            <span className={getStatusChip(reservation.status)}>{reservation.status}</span>
        </div>
    </div>
);

const WaitlistRow: React.FC<{ entry: WaitlistEntry }> = ({ entry }) => {
    const { seatFromWaitlist, removeWaitlistEntry } = useAppContext();
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center">
                <div className="ml-3">
                    <p className="text-sm font-semibold text-gray-900">{entry.guestName}</p>
                    <p className="text-xs text-gray-500 flex items-center">
                       <UserGroupIcon className="w-3.5 h-3.5 mr-1" /> {entry.partySize} · In attesa da {formatDistanceToNow(new Date(entry.createdAt), { locale: it })}
                    </p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={() => seatFromWaitlist(entry.id)} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Accomoda</button>
                <button onClick={() => removeWaitlistEntry(entry.id)} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Rimuovi</button>
            </div>
        </div>
    );
};

const KpiItem: React.FC<{title: string, value: string | number, icon: React.ReactNode, color: string}> = ({title, value, icon, color}) => (
    <div className="flex items-center p-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const TableStatusSummary: React.FC = () => {
    const { tables } = useAppContext();
    const statusCounts = useMemo(() => {
        return tables.reduce((acc, table) => {
            acc[table.status] = (acc[table.status] || 0) + 1;
            return acc;
        }, {} as Record<TableStatus, number>);
    }, [tables]);

    const statusInfo = {
        [TableStatus.Available]: { label: 'Disponibili', color: 'bg-green-500' },
        [TableStatus.Occupied]: { label: 'Occupati', color: 'bg-red-500' },
        [TableStatus.Reserved]: { label: 'Riservati', color: 'bg-blue-500' },
        [TableStatus.Cleaning]: { label: 'Da Pulire', color: 'bg-orange-500' },
    };

    return (
         <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Stato Tavoli</h3>
            <div className="space-y-3">
                {Object.entries(statusInfo).map(([status, {label, color}]) => {
                    const count = statusCounts[status as TableStatus] || 0;
                    return (
                        <div key={status} className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-3 ${color}`}></span>
                                <span className="text-gray-700">{label}</span>
                            </div>
                            <span className="font-bold text-gray-900">{count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DashboardCharts: React.FC<{ reservations: Reservation[]; kpis: any; }> = ({ reservations, kpis }) => {
    const statusCounts = useMemo(() => {
        const counts = reservations.reduce((acc, res) => {
            acc[res.status] = (acc[res.status] || 0) + 1;
            return acc;
        }, {} as Record<ReservationStatus, number>);

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0);
    }, [reservations]);
    
    const STATUS_COLORS: {[key in ReservationStatus]?: string} = {
        [ReservationStatus.Confirmed]: '#3498DB',
        [ReservationStatus.Seated]: '#2ECC71',
        [ReservationStatus.Completed]: '#95A5A6',
        [ReservationStatus.Cancelled]: '#F1C40F',
        [ReservationStatus.NoShow]: '#E74C3C',
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Prenotazioni per Fascia Oraria</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={kpis.reservationsByTime} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <XAxis dataKey="time" />
                            <YAxis allowDecimals={false} />
                            <Tooltip cursor={{fill: 'rgba(235, 245, 255, 0.6)'}} />
                            <Bar dataKey="reservations" fill="#1E40AF" name="Prenotazioni"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
             <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Riepilogo Stato Prenotazioni</h3>
                 {statusCounts.length > 0 ? (
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={statusCounts}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={110}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {statusCounts.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as ReservationStatus] || '#cccccc'} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value} prenotazioni`}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                 ) : <p className="text-center text-gray-500 py-4">Nessun dato sullo stato da mostrare.</p>}
            </div>
        </div>
    );
};


const Dashboard: React.FC = () => {
    const { reservations, waitlist, loading, currentLocation, kpis } = useAppContext();
    const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState('today');
    const [activeTab, setActiveTab] = useState<'timeline' | 'analytics'>('timeline');

    const dateRange = useMemo(() => {
        const now = new Date();
        const today = startOfDay(now);
        switch (dateFilter) {
            case 'yesterday':
                const yesterday = subDays(today, 1);
                return { start: yesterday, end: endOfDay(yesterday) };
            case 'last7':
                return { start: subDays(today, 6), end: endOfDay(now) };
            case 'thisMonth':
                return { start: startOfMonth(today), end: endOfDay(now) };
            case 'today':
            default:
                return { start: today, end: endOfDay(now) };
        }
    }, [dateFilter]);

    const filteredReservations = useMemo(() => {
        return reservations
            .filter(r => isWithinInterval(new Date(r.reservationTime), dateRange))
            .sort((a,b) => new Date(a.reservationTime).getTime() - new Date(b.reservationTime).getTime());
    }, [reservations, dateRange]);
    
    const dashboardKpis = useMemo(() => {
        const totalReservations = filteredReservations.length;
        const totalCovers = filteredReservations.reduce((sum, r) => sum + r.partySize, 0);
        return { totalReservations, totalCovers };
    }, [filteredReservations]);
    
    const { seated, later } = useMemo(() => {
        const todayReservations = reservations.filter(r => isToday(new Date(r.reservationTime)));
        
        return todayReservations.reduce((acc, res) => {
            if (res.status === ReservationStatus.Seated) {
                acc.seated.push(res);
            } else if (res.status === ReservationStatus.Confirmed) {
                 if (isFuture(new Date(res.reservationTime))) {
                    acc.later.push(res);
                 }
            }
            return acc;
        }, { seated: [], later: [] } as { seated: Reservation[], later: Reservation[] });

    }, [reservations]);


    if (loading) return <div className="text-center p-8">Caricamento dashboard...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Riepilogo</h1>
                    <p className="text-gray-500 mt-1">Benvenuto, ecco la situazione di oggi per {currentLocation?.name}.</p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <label htmlFor="date-filter" className="text-sm font-medium text-gray-700">Mostra:</label>
                    <select
                        id="date-filter"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        aria-label="Seleziona periodo di tempo"
                    >
                        <option value="today">Oggi</option>
                        <option value="yesterday">Ieri</option>
                        <option value="last7">Ultimi 7 giorni</option>
                        <option value="thisMonth">Questo Mese</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex space-x-1 border-b">
                        <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'timeline' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                            Vista Operativa
                        </button>
                        <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'analytics' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                            Analisi
                        </button>
                    </div>

                    {activeTab === 'timeline' && (
                        <>
                            <div className="bg-white p-6 rounded-2xl shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Timeline Prenotazioni di Oggi</h3>
                                <div className="space-y-4">
                                    {seated.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase text-green-600 tracking-wider mb-2">Accomodati</h4>
                                            {seated.map(res => <ReservationTimelineRow key={res.id} reservation={res} />)}
                                        </div>
                                    )}
                                    {later.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase text-blue-600 tracking-wider mb-2">Prossime Prenotazioni</h4>
                                            {later.map(res => <ReservationTimelineRow key={res.id} reservation={res} />)}
                                        </div>
                                    )}
                                    {seated.length === 0 && later.length === 0 && (
                                        <p className="text-center text-gray-500 py-4">Nessuna prenotazione per oggi.</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold text-gray-800">Lista d'Attesa</h3>
                                    <button onClick={() => setIsWaitlistModalOpen(true)} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-700">
                                        <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                                        Aggiungi
                                    </button>
                                </div>
                                {waitlist.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {waitlist.map(entry => <WaitlistRow key={entry.id} entry={entry} />)}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-500 py-4">La lista d'attesa è vuota.</p>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'analytics' && <DashboardCharts reservations={filteredReservations} kpis={kpis} />}

                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    <div className="bg-white p-2 rounded-2xl shadow-sm">
                         <h3 className="text-lg font-semibold text-gray-800 mb-2 px-4 pt-4">Statistiche Veloci ({dateFilter === 'today' ? 'Oggi' : 'Periodo Selezionato'})</h3>
                         <div className="divide-y divide-gray-100">
                            <KpiItem title="Prenotazioni" value={dashboardKpis.totalReservations} icon={<CalendarIcon className="w-5 h-5"/>} color="bg-blue-100 text-blue-600" />
                            <KpiItem title="Coperti Totali" value={dashboardKpis.totalCovers} icon={<UserGroupIcon className="w-5 h-5"/>} color="bg-green-100 text-green-600" />
                            <KpiItem title="In Lista d'Attesa" value={waitlist.length} icon={<ClipboardListIcon className="w-5 h-5"/>} color="bg-yellow-100 text-yellow-600" />
                         </div>
                    </div>
                    <TableStatusSummary />
                </div>
            </div>

            {isWaitlistModalOpen && <WaitlistModal onClose={() => setIsWaitlistModalOpen(false)} />}
        </div>
    );
};

export default Dashboard;
