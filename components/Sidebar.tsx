
import React from 'react';
import { UsersIcon, ChartBarIcon, CogIcon, CalendarIcon, MapIcon, IdentificationIcon, CashIcon, ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';
import { useAppContext } from '../contexts/AppContext';

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
  const { sidebarCollapsed, toggleSidebar } = useAppContext();

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
        <NavLink
          href="#dashboard"
          icon={<CalendarIcon className="h-6 w-6" />}
          label="Riepilogo"
          isActive={currentPage === 'dashboard'}
          collapsed={sidebarCollapsed}
        />
        <NavLink
          href="#reservations"
          icon={<UsersIcon className="h-6 w-6" />}
          label="Prenotazioni"
          isActive={currentPage === 'reservations'}
          collapsed={sidebarCollapsed}
        />
         <NavLink
          href="#table-management"
          icon={<MapIcon className="h-6 w-6" />}
          label="Gestione Tavoli"
          isActive={currentPage === 'table-management'}
          collapsed={sidebarCollapsed}
        />
        <NavLink
          href="#crm"
          icon={<IdentificationIcon className="h-6 w-6" />}
          label="Clienti"
          isActive={currentPage === 'crm'}
          collapsed={sidebarCollapsed}
        />
        <NavLink
          href="#analytics"
          icon={<ChartBarIcon className="h-6 w-6" />}
          label="Analisi"
          isActive={currentPage === 'analytics'}
          collapsed={sidebarCollapsed}
        />
        <NavLink
          href="#financial-plan"
          icon={<CashIcon className="h-6 w-6" />}
          label="Piano Finanziario"
          isActive={currentPage === 'financial-plan'}
          collapsed={sidebarCollapsed}
        />
        <NavLink
          href="#settings"
          icon={<CogIcon className="h-6 w-6" />}
          label="Impostazioni"
          isActive={currentPage === 'settings'}
          collapsed={sidebarCollapsed}
        />
      </nav>
    </aside>
  );
};

export default Sidebar;