// Dashboard Component - Main dashboard component integrating all sections
import React, { Suspense } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { HeroSection } from './components/HeroSection';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { GlassCard } from './components/GlassCard';
import { useAppContext } from '../../contexts/AppContext';

// Lazy load heavy components
const FinancialOverview = React.lazy(() =>
  import('./components/FinancialOverview').then(m => ({
    default: m.FinancialOverview,
  }))
);
const BCGMatrix = React.lazy(() =>
  import('./components/BCGMatrix').then(m => ({ default: m.BCGMatrix }))
);
const SalesAnalysis = React.lazy(() =>
  import('./components/SalesAnalysis').then(m => ({ default: m.SalesAnalysis }))
);
const AIInsights = React.lazy(() =>
  import('./components/AIInsights').then(m => ({ default: m.AIInsights }))
);
const Timeline48Months = React.lazy(() =>
  import('./components/Timeline48Months').then(m => ({
    default: m.Timeline48Months,
  }))
);

export const Dashboard: React.FC = () => {
  const { currentLocation } = useAppContext();
  const { dashboardData, loading, error, periodFilter, setPeriodFilter } =
    useDashboardData();

  if (!currentLocation?.id) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Seleziona una location per visualizzare la dashboard
          </p>
        </div>
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="space-y-6 p-6">
        <LoadingSkeleton height="200px" count={1} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton height="400px" count={2} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Nessun dato disponibile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Hero Section */}
      <HeroSection
        kpis={dashboardData.kpis}
        loading={loading}
        periodFilter={periodFilter}
        onPeriodChange={setPeriodFilter}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Overview */}
        <Suspense
          fallback={
            <GlassCard>
              <LoadingSkeleton height="300px" />
            </GlassCard>
          }
        >
          <FinancialOverview data={dashboardData.financialData} />
        </Suspense>

        {/* BCG Matrix */}
        <Suspense
          fallback={
            <GlassCard>
              <LoadingSkeleton height="300px" />
            </GlassCard>
          }
        >
          <BCGMatrix recipes={dashboardData.bcgMatrix} />
        </Suspense>

        {/* Sales Analysis */}
        <Suspense
          fallback={
            <GlassCard>
              <LoadingSkeleton height="300px" />
            </GlassCard>
          }
        >
          <SalesAnalysis data={dashboardData.salesAnalysis} />
        </Suspense>

        {/* AI Insights */}
        <Suspense
          fallback={
            <GlassCard>
              <LoadingSkeleton height="300px" />
            </GlassCard>
          }
        >
          <AIInsights
            insights={dashboardData.aiInsights}
            predictions={dashboardData.aiPredictions}
          />
        </Suspense>
      </div>

      {/* Timeline 48 Months - Full Width */}
      <Suspense
        fallback={
          <GlassCard>
            <LoadingSkeleton height="400px" />
          </GlassCard>
        }
      >
        <Timeline48Months data={dashboardData.financialData} />
      </Suspense>
    </div>
  );
};

export default Dashboard;
