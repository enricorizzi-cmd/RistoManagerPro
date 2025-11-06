import React from 'react';
import { UsersIcon, CogIcon, CashIcon } from './icons/Icons';
import { useAuth } from '../contexts/AuthContext';

interface MobileNavProps {
  currentPage: string;
}

const NavLink: React.FC<{
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}> = ({ href, icon, label, isActive }) => {
  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center flex-1 pt-2 pb-1 text-xs transition-colors duration-200 ${
        isActive ? 'text-primary' : 'text-gray-500 hover:text-primary-600'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      <span className="mt-1">{label}</span>
    </a>
  );
};

const MobileNav: React.FC<MobileNavProps> = ({ currentPage }) => {
  const { user } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg flex z-40">
      <NavLink
        href="#financial-plan"
        icon={<CashIcon className="h-6 w-6" />}
        label="Piano"
        isActive={currentPage === 'financial-plan'}
      />
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
