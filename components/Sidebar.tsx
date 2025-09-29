
import React from 'react';
import { UsersIcon, ChartBarIcon, CogIcon, CalendarIcon, MapIcon, IdentificationIcon, CashIcon } from './icons/Icons';

interface SidebarProps {
  currentPage: string;
}

const NavLink: React.FC<{ href: string; icon: React.ReactNode; label: string; isActive: boolean }> = ({ href, icon, label, isActive }) => {
  return (
    <a
      href={href}
      className={`flex items-center px-4 py-3 my-1 text-sm font-medium rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-primary text-white'
          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </a>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentPage }) => {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-20 border-b">
        <h1 className="text-2xl font-bold text-primary">RistoManager</h1>
      </div>
      <nav className="flex-1 px-4 py-4">
        <NavLink
          href="#dashboard"
          icon={<CalendarIcon className="h-6 w-6" />}
          label="Riepilogo"
          isActive={currentPage === 'dashboard'}
        />
        <NavLink
          href="#reservations"
          icon={<UsersIcon className="h-6 w-6" />}
          label="Prenotazioni"
          isActive={currentPage === 'reservations'}
        />
         <NavLink
          href="#table-management"
          icon={<MapIcon className="h-6 w-6" />}
          label="Gestione Tavoli"
          isActive={currentPage === 'table-management'}
        />
        <NavLink
          href="#crm"
          icon={<IdentificationIcon className="h-6 w-6" />}
          label="Clienti"
          isActive={currentPage === 'crm'}
        />
        <NavLink
          href="#analytics"
          icon={<ChartBarIcon className="h-6 w-6" />}
          label="Analisi"
          isActive={currentPage === 'analytics'}
        />
        <NavLink
          href="#financial-plan"
          icon={<CashIcon className="h-6 w-6" />}
          label="Piano Finanziario"
          isActive={currentPage === 'financial-plan'}
        />
        <NavLink
          href="#settings"
          icon={<CogIcon className="h-6 w-6" />}
          label="Impostazioni"
          isActive={currentPage === 'settings'}
        />
      </nav>
    </aside>
  );
};

export default Sidebar;