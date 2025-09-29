
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { RestaurantLocation } from '../types';

const Settings: React.FC = () => {
    const { currentLocation, updateLocationSettings, loading } = useAppContext();
    const [formState, setFormState] = useState<RestaurantLocation | null>(currentLocation);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormState(currentLocation);
    }, [currentLocation]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formState) return;
        const { name, value } = e.target;
        setFormState(prevState => ({
            ...prevState!,
            [name]: name === 'capacity' ? parseInt(value, 10) || 0 : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState || !currentLocation) return;
        setIsSaving(true);
        await updateLocationSettings(currentLocation.id, formState);
        setIsSaving(false);
    };
    
    if (loading && !currentLocation) {
        return <div>Caricamento impostazioni...</div>
    }
    
    if (!formState) {
        return <div>Nessuna sede selezionata.</div>
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Impostazioni: {currentLocation?.name}</h1>
            
            <div className="max-w-2xl">
                <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-xl p-8 space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Nome Ristorante
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formState.name}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                            Capacità Totale Posti
                        </label>
                        <input
                            type="number"
                            name="capacity"
                            id="capacity"
                            value={formState.capacity}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="openTime" className="block text-sm font-medium text-gray-700">
                                Orario di Apertura
                            </label>
                            <input
                                type="time"
                                name="openTime"
                                id="openTime"
                                value={formState.openTime}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="closeTime" className="block text-sm font-medium text-gray-700">
                                Orario di Chiusura
                            </label>
                            <input
                                type="time"
                                name="closeTime"
                                id="closeTime"
                                value={formState.closeTime}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="pt-5">
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving || loading}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
                            >
                                {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;