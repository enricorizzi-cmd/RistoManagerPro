
import React from 'react';
import { UsersIcon, ChartBarIcon, CogIcon, CalendarIcon, MapIcon, IdentificationIcon, CashIcon } from './icons/Icons';

interface MobileNavProps {
  currentPage: string;
}

const NavLink: React.FC<{ href: string; icon: React.ReactNode; label: string; isActive: boolean }> = ({ href, icon, label, isActive }) => {
  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors duration-200 ${
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
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg grid grid-cols-7 z-40">
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
        label="Tavoli"
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
        label="Piano"
        isActive={currentPage === 'financial-plan'}
      />
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