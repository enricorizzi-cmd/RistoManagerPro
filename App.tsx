import React, { useState, useEffect, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import NotificationContainer from './components/NotificationContainer';
import Chatbot from './components/Chatbot';
import AuthPage from './components/auth/AuthPage';
import { useAuth } from './contexts/AuthContext';

const Settings = lazy(() => import('./components/Settings'));
const FinancialPlan = lazy(() => import('./components/FinancialPlan'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const MenuEngineering = lazy(() => import('./components/MenuEngineering'));

type Page = 'financial-plan' | 'settings' | 'users' | 'menu-engineering';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('financial-plan');
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as Page;
      if (
        ['financial-plan', 'settings', 'users', 'menu-engineering'].includes(
          hash
        )
      ) {
        setCurrentPage(hash);
      } else {
        setCurrentPage('financial-plan');
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
      case 'financial-plan':
        return <FinancialPlan />;
      case 'settings':
        return <Settings />;
      case 'users':
        return <UserManagement />;
      case 'menu-engineering':
        return <MenuEngineering />;
      default:
        return <FinancialPlan />;
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar currentPage={currentPage} />
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 md:ml-0">
        <Header currentPage={currentPage} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-gray-500">
                Caricamento...
              </div>
            }
          >
            {renderPage()}
          </Suspense>
        </main>
      </div>
      <MobileNav currentPage={currentPage} />
      <NotificationContainer />
      <Chatbot />
    </div>
  );
};

export default App;
