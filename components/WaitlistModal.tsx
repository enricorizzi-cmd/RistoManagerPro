
import React, { useState } from 'react';
import { WaitlistEntry } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface WaitlistModalProps {
    onClose: () => void;
}

const WaitlistModal: React.FC<WaitlistModalProps> = ({ onClose }) => {
    const { addWaitlistEntry } = useAppContext();
    // Fix: Correct the type to not expect `locationId`, which is added by the context.
    const [formData, setFormData] = useState<Omit<WaitlistEntry, 'id' | 'createdAt' | 'locationId'>>({
        guestName: '',
        partySize: 2,
        phone: '',
        quotedWaitTime: 15,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'partySize' || name === 'quotedWaitTime' ? parseInt(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addWaitlistEntry(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Aggiungi alla Lista d'Attesa</h2>
                        <div className="space-y-4">
                            <input name="guestName" value={formData.guestName} onChange={handleChange} placeholder="Nome Cliente" required className="w-full px-3 py-2 border rounded" />
                            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Numero di Telefono" required className="w-full px-3 py-2 border rounded" />
                            <div className="flex space-x-4">
                                <div>
                                    <label htmlFor="partySize" className="text-sm font-medium text-gray-700">Numero Coperti</label>
                                    <input id="partySize" name="partySize" type="number" value={formData.partySize} onChange={handleChange} required className="w-full px-3 py-2 border rounded" min="1"/>
                                </div>
                                <div>
                                    <label htmlFor="quotedWaitTime" className="text-sm font-medium text-gray-700">Attesa Stimata (min)</label>
                                    <input id="quotedWaitTime" name="quotedWaitTime" type="number" value={formData.quotedWaitTime} onChange={handleChange} required className="w-full px-3 py-2 border rounded" min="0" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-primary border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700">Aggiungi alla Lista</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WaitlistModal;