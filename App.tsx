import React, { useState, useEffect, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import NotificationContainer from './components/NotificationContainer';
import WalkinWaitlistModal from './components/WalkinWaitlistModal';
import { useAppContext } from './contexts/AppContext';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Reservations = lazy(() => import('./components/Reservations'));
const Analytics = lazy(() => import('./components/Analytics'));
const Settings = lazy(() => import('./components/Settings'));
const TableManagement = lazy(() => import('./components/TableManagement'));
const Crm = lazy(() => import('./components/Crm'));
const FinancialPlan = lazy(() => import('./components/FinancialPlan'));
const MenuEngineering = lazy(() => import('./components/MenuEngineering'));
const SalesAnalytics = lazy(() => import('./components/SalesAnalytics'));

type Page = 'dashboard' | 'reservations' | 'analytics' | 'table-management' | 'crm' | 'financial-plan' | 'settings' | 'menu-engineering' | 'sales-analytics';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);
  const { sidebarCollapsed } = useAppContext();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as Page;
      if (['dashboard', 'reservations', 'analytics', 'table-management', 'crm', 'financial-plan', 'settings', 'menu-engineering', 'sales-analytics'].includes(hash)) {
        setCurrentPage(hash);
      } else {
        setCurrentPage('dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'reservations':
        return <Reservations />;
      case 'analytics':
        return <Analytics />;
      case 'table-management':
        return <TableManagement />;
      case 'crm':
        return <Crm />;
      case 'financial-plan':
        return <FinancialPlan />;
      case 'settings':
        return <Settings />;
      case 'menu-engineering':
        return <MenuEngineering />;
      case 'sales-analytics':
        return <SalesAnalytics />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar currentPage={currentPage} />
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <Header onOpenWalkinModal={() => setIsWalkinModalOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-gray-500">Caricamento...</div>}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
      <MobileNav currentPage={currentPage} />
      <NotificationContainer />
      {isWalkinModalOpen && <WalkinWaitlistModal onClose={() => setIsWalkinModalOpen(false)} />}
    </div>
  );
};

export default App;
