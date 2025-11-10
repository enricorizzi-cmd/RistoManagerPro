import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useFinancialPlanLocations } from '../hooks/useFinancialPlanLocations';

interface HeaderProps {
  currentPage?: string;
}

const Header: React.FC<HeaderProps> = ({ currentPage }) => {
  const { currentLocation, locations, setCurrentLocation, loading } =
    useAppContext();
  const { locations: financialPlanLocations } = useFinancialPlanLocations();

  // Use financial plan locations if we're in the financial plan page
  const displayLocations =
    currentPage === 'financial-plan' ? financialPlanLocations : locations;

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentLocation(e.target.value);
  };

  // Ensure displayLocations is always an array
  const safeLocations = Array.isArray(displayLocations) ? displayLocations : [];

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'financial-plan':
        return 'Piano Finanziario';
      case 'menu-engineering':
        return 'Menu Engineering';
      case 'sales-analysis':
        return 'Analisi Vendite';
      case 'users':
        return 'Gestione Utenti';
      case 'settings':
        return 'Impostazioni';
      default:
        return currentLocation?.name || 'RistoManager Pro';
    }
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 gap-4">
      <h2 className="text-xl font-semibold text-gray-800 hidden sm:block truncate">
        {getPageTitle()}
      </h2>
      <div className="flex-1 flex justify-end items-center gap-4">
        <select
          value={currentLocation?.id || ''}
          onChange={handleLocationChange}
          disabled={loading || safeLocations.length <= 1}
          className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-100"
          aria-label="Seleziona una sede"
        >
          {safeLocations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};

export default Header;
