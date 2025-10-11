
import React, { useState, useEffect } from 'react';
import { UsersIcon, ChartBarIcon, CogIcon, CalendarIcon, MapIcon, IdentificationIcon, CashIcon } from './icons/Icons';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

interface MobileNavProps {
  currentPage: string;
}

const NavLink: React.FC<{ href: string; icon: React.ReactNode; label: string; isActive: boolean }> = ({ href, icon, label, isActive }) => {
  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center flex-1 pt-2 pb-1 text-xs transition-colors duration-200 ${
        isActive
          ? 'text-primary'
          : 'text-gray-500 hover:text-primary-600'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      <span className="mt-1">{label}</span>
    </a>
  );
};


const MobileNav: React.FC<MobileNavProps> = ({ currentPage }) => {
  const { currentLocation } = useAppContext();
  const { user, token } = useAuth();
  const [enabledTabs, setEnabledTabs] = useState<string[]>([]);

  useEffect(() => {
    if (currentLocation?.id && token) {
      fetchEnabledTabs();
    }
  }, [currentLocation?.id, token]);

  const fetchEnabledTabs = async () => {
    if (!currentLocation?.id || !token) return;
    
    try {
      const response = await fetch(`http://localhost:4000/api/user/enabled-tabs/${currentLocation.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const tabs = await response.json();
        setEnabledTabs(tabs.map((tab: any) => tab.tab_name));
      }
    } catch (error) {
      console.error('Failed to fetch enabled tabs:', error);
      // Fallback to all tabs enabled
      setEnabledTabs(['dashboard', 'reservations', 'waitlist', 'tables', 'menu', 'sales', 'customers', 'financial-plan']);
    }
  };

  const isTabEnabled = (tabName: string) => {
    // If no tabs are loaded yet, show all tabs (loading state)
    if (enabledTabs.length === 0) return true;
    return enabledTabs.includes(tabName);
  };


  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg flex z-40">
      {isTabEnabled('dashboard') && (
        <NavLink
          href="#dashboard"
          icon={<CalendarIcon className="h-6 w-6" />}
          label="Riepilogo"
          isActive={currentPage === 'dashboard'}
        />
      )}
      {isTabEnabled('reservations') && (
        <NavLink
          href="#reservations"
          icon={<UsersIcon className="h-6 w-6" />}
          label="Prenotazioni"
          isActive={currentPage === 'reservations'}
        />
      )}
      {isTabEnabled('tables') && (
        <NavLink
          href="#table-management"
          icon={<MapIcon className="h-6 w-6" />}
          label="Tavoli"
          isActive={currentPage === 'table-management'}
        />
      )}
      {isTabEnabled('customers') && (
        <NavLink
          href="#crm"
          icon={<IdentificationIcon className="h-6 w-6" />}
          label="Clienti"
          isActive={currentPage === 'crm'}
        />
      )}
      {isTabEnabled('sales') && (
        <NavLink
          href="#analytics"
          icon={<ChartBarIcon className="h-6 w-6" />}
          label="Analisi"
          isActive={currentPage === 'analytics'}
        />
      )}
      {isTabEnabled('financial-plan') && (
        <NavLink
          href="#financial-plan"
          icon={<CashIcon className="h-6 w-6" />}
          label="Piano"
          isActive={currentPage === 'financial-plan'}
        />
      )}
      {user?.role === 'admin' && (
        <NavLink
          href="#users"
          icon={<UsersIcon className="h-6 w-6" />}
          label="Utenti"
          isActive={currentPage === 'users'}
        />
      )}
      <NavLink
        href="#settings"
        icon={<CogIcon className="h-6 w-6" />}
        label="Impostazioni"
        isActive={currentPage === 'settings'}
      />
    </nav>
  );
};

export default MobileNav;