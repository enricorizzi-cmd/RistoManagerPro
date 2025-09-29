
import React, { useState } from 'react';
import { Reservation, ReservationStatus } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface ReservationModalProps {
    onClose: () => void;
}

const ReservationModal: React.FC<ReservationModalProps> = ({ onClose }) => {
    const { addReservation } = useAppContext();
    // Fix: Correct the type to not expect `locationId`, which is added by the context.
    const [formData, setFormData] = useState<Omit<Reservation, 'id' | 'status' | 'locationId'>>({
        guestName: '',
        partySize: 2,
        reservationTime: new Date().toISOString().substring(0, 16),
        phone: '',
        email: '',
        notes: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'partySize' ? parseInt(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const reservationData = {
            ...formData,
            reservationTime: new Date(formData.reservationTime).toISOString(),
            status: ReservationStatus.Confirmed,
        }
        await addReservation(reservationData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Nuova Prenotazione</h2>
                        <div className="space-y-4">
                            <input name="guestName" value={formData.guestName} onChange={handleChange} placeholder="Nome Cliente" required className="w-full px-3 py-2 border rounded" />
                            <div className="flex space-x-4">
                                <input name="partySize" type="number" value={formData.partySize} onChange={handleChange} placeholder="Numero Coperti" required className="w-1/2 px-3 py-2 border rounded" min="1"/>
                                <input name="reservationTime" type="datetime-local" value={formData.reservationTime} onChange={handleChange} required className="w-1/2 px-3 py-2 border rounded" />
                            </div>
                            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Numero di Telefono" required className="w-full px-3 py-2 border rounded" />
                            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Indirizzo Email" className="w-full px-3 py-2 border rounded" />
                            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Note (es. allergie, occasioni speciali)" className="w-full px-3 py-2 border rounded" rows={3}></textarea>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-primary border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700">Aggiungi Prenotazione</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReservationModal;