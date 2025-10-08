
import React, { useState, useEffect } from 'react';
import { UsersIcon, ChartBarIcon, CogIcon, CalendarIcon, MapIcon, IdentificationIcon, CashIcon, ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentPage: string;
}

const NavLink: React.FC<{ href: string; icon: React.ReactNode; label: string; isActive: boolean; collapsed: boolean }> = ({ href, icon, label, isActive, collapsed }) => {
  return (
    <a
      href={href}
      className={`flex items-center py-3 my-1 text-sm font-medium rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-primary text-white'
          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      } ${collapsed ? 'justify-center px-2' : 'px-4'}`}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span className="ml-3">{label}</span>}
    </a>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentPage }) => {
  const { sidebarCollapsed, toggleSidebar, currentLocation } = useAppContext();
  const { user, logout, token } = useAuth();
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
    <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex items-center justify-between h-20 border-b px-4">
        {!sidebarCollapsed && <h1 className="text-2xl font-bold text-primary">RistoManager</h1>}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          title={sidebarCollapsed ? 'Espandi menu' : 'Comprimi menu'}
        >
          {sidebarCollapsed ? (
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>
      <nav className={`flex-1 py-4 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
        {isTabEnabled('dashboard') && (
          <NavLink
            href="#dashboard"
            icon={<CalendarIcon className="h-6 w-6" />}
            label="Riepilogo"
            isActive={currentPage === 'dashboard'}
            collapsed={sidebarCollapsed}
          />
        )}
        {isTabEnabled('reservations') && (
          <NavLink
            href="#reservations"
            icon={<UsersIcon className="h-6 w-6" />}
            label="Prenotazioni"
            isActive={currentPage === 'reservations'}
            collapsed={sidebarCollapsed}
          />
        )}
        {isTabEnabled('waitlist') && (
          <NavLink
            href="#waitlist"
            icon={<UsersIcon className="h-6 w-6" />}
            label="Lista d'attesa"
            isActive={currentPage === 'waitlist'}
            collapsed={sidebarCollapsed}
          />
        )}
        {isTabEnabled('menu') && (
          <NavLink
            href="#menu"
            icon={<ChartBarIcon className="h-6 w-6" />}
            label="Menu"
            isActive={currentPage === 'menu'}
            collapsed={sidebarCollapsed}
          />
        )}
        {isTabEnabled('tables') && (
          <NavLink
            href="#table-management"
            icon={<MapIcon className="h-6 w-6" />}
            label="Gestione Tavoli"
            isActive={currentPage === 'table-management'}
            collapsed={sidebarCollapsed}
          />
        )}
        {isTabEnabled('customers') && (
          <NavLink
            href="#crm"
            icon={<IdentificationIcon className="h-6 w-6" />}
            label="Clienti"
            isActive={currentPage === 'crm'}
            collapsed={sidebarCollapsed}
          />
        )}
        {isTabEnabled('sales') && (
          <NavLink
            href="#analytics"
            icon={<ChartBarIcon className="h-6 w-6" />}
            label="Analisi"
            isActive={currentPage === 'analytics'}
            collapsed={sidebarCollapsed}
          />
        )}
        {isTabEnabled('financial-plan') && (
          <NavLink
            href="#financial-plan"
            icon={<CashIcon className="h-6 w-6" />}
            label="Piano Finanziario"
            isActive={currentPage === 'financial-plan'}
            collapsed={sidebarCollapsed}
          />
        )}
        {user?.role === 'admin' && (
          <NavLink
            href="#users"
            icon={<UsersIcon className="h-6 w-6" />}
            label="Utenti"
            isActive={currentPage === 'users'}
            collapsed={sidebarCollapsed}
          />
        )}
        <NavLink
          href="#settings"
          icon={<CogIcon className="h-6 w-6" />}
          label="Impostazioni"
          isActive={currentPage === 'settings'}
          collapsed={sidebarCollapsed}
        />
      </nav>
      
      {/* User info and logout */}
      <div className={`border-t border-gray-200 p-4 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
        {!sidebarCollapsed && (
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-gray-500">{user?.email}</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center py-2 px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors duration-200 ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
          title={sidebarCollapsed ? 'Logout' : undefined}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!sidebarCollapsed && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;