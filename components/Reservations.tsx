
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Reservation, ReservationStatus } from '../types';
import { format } from 'date-fns';
import { PlusIcon, ChevronDownIcon, UserGroupIcon, ClockIcon } from './icons/Icons';
import ReservationModal from './ReservationModal';

const statusColors: { [key in ReservationStatus]: string } = {
    [ReservationStatus.Confirmed]: 'bg-blue-100 text-blue-800',
    [ReservationStatus.Seated]: 'bg-green-100 text-green-800',
    [ReservationStatus.Completed]: 'bg-gray-200 text-gray-800',
    [ReservationStatus.NoShow]: 'bg-red-100 text-red-800',
    [ReservationStatus.Cancelled]: 'bg-yellow-100 text-yellow-800',
};

const StatusDropdown: React.FC<{ reservation: Reservation }> = ({ reservation }) => {
    const { updateReservationStatus } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);

    const handleStatusChange = (status: ReservationStatus) => {
        if (status === ReservationStatus.Cancelled || status === ReservationStatus.NoShow) {
            if (window.confirm(`Sei sicuro di voler contrassegnare questa prenotazione come "${status}"?`)) {
                updateReservationStatus(reservation.id, status);
            }
        } else {
            updateReservationStatus(reservation.id, status);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left">
            <div>
                <button
                    type="button"
                    className={`inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-3 py-1 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none ${statusColors[reservation.status]}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {reservation.status}
                    <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" />
                </button>
            </div>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {Object.values(ReservationStatus).map(status => (
                            <button
                                key={status}
                                onClick={() => handleStatusChange(status)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="menuitem"
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ReservationCard: React.FC<{ reservation: Reservation }> = ({ reservation }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
            <div>
                <p className="font-semibold text-gray-800">{reservation.guestName}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                    <UserGroupIcon className="w-4 h-4 mr-1.5" />
                    <span>{reservation.partySize}</span>
                    <span className="mx-2">·</span>
                    <ClockIcon className="w-4 h-4 mr-1.5" />
                    <span>{format(new Date(reservation.reservationTime), 'p')}</span>
                </div>
            </div>
            <StatusDropdown reservation={reservation} />
        </div>
        {reservation.notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Note:</span>{' '}
                    <span className="italic">"{reservation.notes}"</span>
                </p>
            </div>
        )}
    </div>
);


const Reservations: React.FC = () => {
    const { reservations, loading, error } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('Tutte');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');

    const filteredReservations = useMemo(() => {
        const selectedDateString = selectedDate.toDateString();
        
        return reservations.filter(r => {
            const isOnDate = new Date(r.reservationTime).toDateString() === selectedDateString;
            const matchesSearch = searchTerm 
                ? r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) 
                : true;
            const matchesStatus = filter === 'Tutte' ? true : r.status === filter;

            return isOnDate && matchesSearch && matchesStatus;
        });
    }, [reservations, filter, selectedDate, searchTerm]);


    if (loading) return <div className="text-center p-8">Caricamento prenotazioni...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">
                   Prenotazioni: {format(selectedDate, 'd MMMM yyyy')}
                </h1>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                           <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                           </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Cerca nome cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-primary focus:border-primary"
                            aria-label="Cerca per nome cliente"
                        />
                    </div>
                    <input
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                            if (e.target.value) {
                                // Using replace to avoid timezone issues where yyyy-mm-dd is interpreted as UTC midnight
                                setSelectedDate(new Date(e.target.value.replace(/-/g, '/')));
                            }
                        }}
                        className="border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-primary focus:border-primary"
                        aria-label="Seleziona data prenotazione"
                    />
                    <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Aggiungi Prenotazione
                    </button>
                </div>
            </div>
            
            <div className="flex space-x-1 border-b overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {['Tutte', ...Object.values(ReservationStatus)].map(status => (
                    <button 
                        key={status} 
                        onClick={() => setFilter(status)}
                        className={`flex-shrink-0 px-3 py-2 text-sm font-medium whitespace-nowrap ${filter === status ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
                {filteredReservations.length > 0 ? (
                    filteredReservations.map(reservation => (
                        <ReservationCard key={reservation.id} reservation={reservation} />
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm">
                        <p>Nessuna prenotazione corrisponde a questo filtro.</p>
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-y-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orario</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coperti</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Azioni</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReservations.length > 0 ? (
                                filteredReservations.map(reservation => (
                                    <tr key={reservation.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{reservation.guestName}</div>
                                            <div className="text-sm text-gray-500">{reservation.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(reservation.reservationTime), 'p')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reservation.partySize}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[reservation.status]}`}>
                                                {reservation.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <StatusDropdown reservation={reservation} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-500">
                                        Nessuna prenotazione trovata con i criteri selezionati.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && <ReservationModal onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

export default Reservations;