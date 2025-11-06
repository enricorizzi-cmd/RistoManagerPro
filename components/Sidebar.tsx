import React from 'react';
import {
  UsersIcon,
  CogIcon,
  CashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BeakerIcon,
} from './icons/Icons';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentPage: string;
}

const NavLink: React.FC<{
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  collapsed: boolean;
}> = ({ href, icon, label, isActive, collapsed }) => {
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
  const { user, logout } = useAuth();

  return (
    <aside
      className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-20 border-b px-4">
        {!sidebarCollapsed && (
          <h1 className="text-2xl font-bold text-primary">RistoManager</h1>
        )}
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
          href="#financial-plan"
          icon={<CashIcon className="h-6 w-6" />}
          label="Piano Finanziario"
          isActive={currentPage === 'financial-plan'}
          collapsed={sidebarCollapsed}
        />
        <NavLink
          href="#menu-engineering"
          icon={<BeakerIcon className="h-6 w-6" />}
          label="Menu Engineering"
          isActive={currentPage === 'menu-engineering'}
          collapsed={sidebarCollapsed}
        />
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
      <div
        className={`border-t border-gray-200 p-4 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}
      >
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
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {!sidebarCollapsed && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
