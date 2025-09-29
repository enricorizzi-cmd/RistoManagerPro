import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableStatus } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { CheckCircleIcon, XCircleIcon, UserGroupIcon } from './icons/Icons';

interface WalkinWaitlistModalProps {
    onClose: () => void;
}

type Step = 'initial' | 'seat' | 'waitlist';

const WalkinWaitlistModal: React.FC<WalkinWaitlistModalProps> = ({ onClose }) => {
    const { tables, addWaitlistEntry, seatWalkIn } = useAppContext();
    const [partySize, setPartySize] = useState<number | ''>(2);
    const [step, setStep] = useState<Step>('initial');
    const [availableTables, setAvailableTables] = useState<Table[]>([]);
    
    // Seat form state
    const [guestNameSeat, setGuestNameSeat] = useState('');
    const [selectedTableId, setSelectedTableId] = useState<string>('');

    // Waitlist form state
    const [guestNameWaitlist, setGuestNameWaitlist] = useState('');
    const [phoneWaitlist, setPhoneWaitlist] = useState('');
    const [quotedWaitTime, setQuotedWaitTime] = useState(15);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (typeof partySize === 'number' && partySize > 0) {
            const suitableTables = tables.filter(t => t.status === TableStatus.Available && t.capacity >= partySize)
                                         .sort((a,b) => a.capacity - b.capacity); // Suggest smaller tables first
            setAvailableTables(suitableTables);
            if (suitableTables.length > 0) {
                setStep('seat');
                setSelectedTableId(suitableTables[0].id); // Pre-select the best fit
            } else {
                setStep('waitlist');
            }
        } else {
            setStep('initial');
        }
    }, [partySize, tables]);
    
    const handlePartySizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPartySize(val === '' ? '' : parseInt(val, 10));
    };

    const handleSeatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTableId || typeof partySize !== 'number' || isSubmitting) return;
        
        setIsSubmitting(true);
        // Fix: Added reservationTime to satisfy the Omit<Reservation, 'id' | 'locationId' | 'status'> type.
        const walkinData = {
            guestName: guestNameSeat || `Walk-in ${partySize} coperti`,
            partySize: partySize,
            reservationTime: new Date().toISOString(),
            phone: '',
            email: '',
            notes: 'Cliente walk-in, accomodato direttamente.',
        };
        await seatWalkIn(walkinData, selectedTableId);
        setIsSubmitting(false);
        onClose();
    };

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestNameWaitlist || !phoneWaitlist || typeof partySize !== 'number' || isSubmitting) return;

        setIsSubmitting(true);
        const waitlistData = {
            guestName: guestNameWaitlist,
            partySize,
            phone: phoneWaitlist,
            quotedWaitTime,
        };
        await addWaitlistEntry(waitlistData);
        setIsSubmitting(false);
        onClose();
    };

    const renderContent = () => {
        switch(step) {
            case 'seat':
                return (
                    <form onSubmit={handleSeatSubmit}>
                        <div className="text-center mb-4 p-3 bg-green-50 border-l-4 border-green-400">
                            <div className="flex justify-center items-center">
                                <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                                <h3 className="text-lg font-semibold text-green-800">Trovato tavolo disponibile!</h3>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="guestNameSeat" className="block text-sm font-medium text-gray-700">Nome Cliente (Opzionale)</label>
                                <input id="guestNameSeat" name="guestNameSeat" value={guestNameSeat} onChange={(e) => setGuestNameSeat(e.target.value)} placeholder={`Walk-in ${partySize} coperti`} className="mt-1 w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label htmlFor="selectedTableId" className="block text-sm font-medium text-gray-700">Seleziona Tavolo</label>
                                <select id="selectedTableId" name="selectedTableId" value={selectedTableId} onChange={e => setSelectedTableId(e.target.value)} required className="mt-1 w-full px-3 py-2 border rounded-md bg-white">
                                    {availableTables.map(table => (
                                        <option key={table.id} value={table.id}>{table.name} (Capienza: {table.capacity})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                         <div className="bg-gray-50 px-6 py-4 -mx-6 -mb-6 mt-6 flex justify-end space-x-3 rounded-b-lg">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-400">
                                {isSubmitting ? 'Procedendo...' : 'Accomoda Cliente'}
                            </button>
                        </div>
                    </form>
                );
            case 'waitlist':
                 return (
                    <form onSubmit={handleWaitlistSubmit}>
                        <div className="text-center mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
                            <div className="flex justify-center items-center">
                                <XCircleIcon className="h-6 w-6 text-yellow-600 mr-2" />
                                <h3 className="text-lg font-semibold text-yellow-800">Nessun tavolo disponibile.</h3>
                            </div>
                        </div>
                        <div className="space-y-4">
                             <input name="guestNameWaitlist" value={guestNameWaitlist} onChange={(e) => setGuestNameWaitlist(e.target.value)} placeholder="Nome Cliente" required className="w-full px-3 py-2 border rounded-md" />
                            <input name="phoneWaitlist" value={phoneWaitlist} onChange={(e) => setPhoneWaitlist(e.target.value)} placeholder="Numero di Telefono" required className="w-full px-3 py-2 border rounded-md" />
                             <div>
                                <label htmlFor="quotedWaitTime" className="text-sm font-medium text-gray-700">Attesa Stimata (min)</label>
                                <input id="quotedWaitTime" name="quotedWaitTime" type="number" value={quotedWaitTime} onChange={(e) => setQuotedWaitTime(parseInt(e.target.value))} required className="w-full px-3 py-2 border rounded-md" min="0" />
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 -mx-6 -mb-6 mt-6 flex justify-end space-x-3 rounded-b-lg">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700 disabled:bg-gray-400">
                                {isSubmitting ? 'Aggiungendo...' : "Aggiungi alla Lista d'Attesa"}
                            </button>
                        </div>
                    </form>
                );
            default:
                return <p className="text-center text-gray-500 py-8">Inserisci il numero di coperti per continuare.</p>;
        }
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-20 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Accogli Cliente</h2>
                    <div className="relative mb-6">
                        <label htmlFor="partySize" className="block text-sm font-medium text-gray-700 mb-1">Quante persone?</label>
                        <div className="relative">
                            <UserGroupIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                id="partySize"
                                name="partySize" 
                                type="number" 
                                value={partySize} 
                                onChange={handlePartySizeChange} 
                                placeholder="Numero Coperti" 
                                required 
                                className="w-full pl-10 pr-4 py-2 text-lg border-gray-300 border rounded-md focus:ring-primary focus:border-primary" 
                                min="1"
                                autoFocus
                            />
                        </div>
                    </div>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default WalkinWaitlistModal;