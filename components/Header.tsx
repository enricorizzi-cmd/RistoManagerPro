import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PlusIcon } from './icons/Icons';

interface HeaderProps {
  onOpenWalkinModal: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenWalkinModal }) => {
  const { currentLocation, locations, setCurrentLocation, loading } = useAppContext();

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentLocation(e.target.value);
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 gap-4">
      <h2 className="text-xl font-semibold text-gray-800 hidden sm:block truncate">{currentLocation?.name || 'Caricamento...'}</h2>
      <div className="flex-1 flex justify-end items-center gap-4">
        <select
          value={currentLocation?.id || ''}
          onChange={handleLocationChange}
          disabled={loading || locations.length <= 1}
          className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-100"
          aria-label="Seleziona una sede"
        >
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
         <button 
          onClick={onOpenWalkinModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Accogli Cliente
        </button>
      </div>
    </header>
  );
};

export default Header;