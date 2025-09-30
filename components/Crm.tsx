
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Customer, Reservation } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { UserGroupIcon, ClockIcon } from './icons/Icons';
import { formatCurrency } from '../utils/format';

const CustomerListItem: React.FC<{ customer: Customer; isSelected: boolean; onSelect: (customer: Customer) => void }> = ({ customer, isSelected, onSelect }) => (
    <button
        onClick={() => onSelect(customer)}
        className={`w-full text-left p-4 rounded-lg transition-colors duration-150 ${isSelected ? 'bg-primary-100' : 'hover:bg-gray-100'}`}
    >
        <p className="font-semibold text-gray-800">{customer.name}</p>
        <p className="text-sm text-gray-500">
            Ultima visita: {formatDistanceToNow(new Date(customer.lastSeen), { addSuffix: true, locale: it })}
        </p>
    </button>
);

const CustomerDetail: React.FC<{ customer: Customer }> = ({ customer }) => (
    <div className="p-6 h-full overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
        <p className="text-sm text-gray-600 mt-1">{customer.phone} | {customer.email}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-6 text-center">
            <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Visite Totali</p>
                <p className="text-2xl font-bold text-primary">{customer.totalVisits}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Spesa Totale</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(customer.totalSpent)}</p>
            </div>
        </div>

        <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Storico Prenotazioni</h3>
            <div className="space-y-4">
                {customer.reservationHistory.length > 0 ? (
                    customer.reservationHistory
                        .sort((a, b) => new Date(b.reservationTime).getTime() - new Date(a.reservationTime).getTime())
                        .map(res => (
                        <div key={res.id} className="bg-white p-4 rounded-lg shadow-sm border">
                             <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-gray-800">{format(new Date(res.reservationTime), 'd MMM yyyy', { locale: it })}</p>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                        <UserGroupIcon className="w-4 h-4 mr-1.5" />
                                        <span>{res.partySize}</span>
                                        <span className="mx-2">Â·</span>
                                        <ClockIcon className="w-4 h-4 mr-1.5" />
                                        <span>{format(new Date(res.reservationTime), 'p', { locale: it })}</span>
                                    </div>
                                </div>
                                 <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{res.status}</span>
                            </div>
                            {res.notes && (
                                <p className="text-xs text-gray-500 italic mt-2 pt-2 border-t">Note: "{res.notes}"</p>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500">Nessuno storico prenotazioni trovato.</p>
                )}
            </div>
        </div>
    </div>
);


const Crm: React.FC = () => {
    const { customers, loading, error } = useAppContext();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customers, searchTerm]);

    // Select the first customer by default on initial load
    React.useEffect(() => {
        if (!selectedCustomer && filteredCustomers.length > 0) {
            setSelectedCustomer(filteredCustomers[0]);
        }
    }, [filteredCustomers, selectedCustomer]);

    if (loading) return <div className="text-center p-8">Caricamento dati clienti...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900">Gestione Clienti</h1>
            <div className="flex-grow flex bg-white rounded-xl shadow-md overflow-hidden">
                <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b">
                         <input
                            type="text"
                            placeholder="Cerca clienti..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(customer => (
                                <CustomerListItem
                                    key={customer.id}
                                    customer={customer}
                                    isSelected={selectedCustomer?.id === customer.id}
                                    onSelect={setSelectedCustomer}
                                />
                            ))
                        ) : (
                            <p className="p-4 text-center text-gray-500">Nessun cliente trovato.</p>
                        )}
                    </div>
                </div>
                <div className="hidden md:block md:w-2/3 bg-gray-50">
                    {selectedCustomer ? (
                        <CustomerDetail customer={selectedCustomer} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">Seleziona un cliente per vederne i dettagli</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Crm;



