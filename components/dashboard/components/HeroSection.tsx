// HeroSection Component - Premium hero section with 4 KPI cards
import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';
import { SparklineChart } from './SparklineChart';
import { GlowBadge } from './GlowBadge';
import { CashIcon, TrendingUpIcon, ChartBarIcon } from '../../icons/Icons';
import type { DashboardKPIs, PeriodFilter } from '../types/dashboard.types';

interface HeroSectionProps {
  kpis: DashboardKPIs;
  loading?: boolean;
  periodFilter?: PeriodFilter;
  onPeriodChange?: (period: PeriodFilter) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  kpis,
  loading = false,
  periodFilter = 'month',
  onPeriodChange,
}) => {
  const kpiCards = [
    {
      key: 'fatturato',
      title: 'Fatturato',
      value: kpis.fatturato.current,
      change: kpis.fatturato.changePercent,
      sparkline: kpis.fatturato.sparkline,
      icon: CashIcon,
      color: 'text-blue-600',
      bgGradient: 'from-blue-500/20 to-blue-600/20',
    },
    {
      key: 'utile',
      title: 'Utile',
      value: kpis.utile.current,
      change: kpis.utile.changePercent,
      sparkline: kpis.utile.sparkline,
      icon: TrendingUpIcon,
      color: kpis.utile.current >= 0 ? 'text-green-600' : 'text-red-600',
      bgGradient:
        kpis.utile.current >= 0
          ? 'from-green-500/20 to-green-600/20'
          : 'from-red-500/20 to-red-600/20',
    },
    {
      key: 'vendite',
      title: 'Vendite',
      value: kpis.vendite.current,
      change: kpis.vendite.changePercent,
      sparkline: kpis.vendite.sparkline,
      icon: ChartBarIcon,
      color: 'text-purple-600',
      bgGradient: 'from-purple-500/20 to-purple-600/20',
    },
    {
      key: 'margine',
      title: 'Margine',
      value: kpis.margine.current,
      change: kpis.margine.changePercent,
      sparkline: kpis.margine.sparkline,
      icon: TrendingUpIcon,
      color: 'text-amber-600',
      bgGradient: 'from-amber-500/20 to-amber-600/20',
    },
  ];

  return (
    <div className="relative w-full mb-8">
      {/* Animated Gradient Background */}
      <motion.div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-20"
          style={{
            background:
              'linear-gradient(135deg, #1E40AF 0%, #6366F1 50%, #EC4899 100%)',
            animation: 'gradient-shift 15s ease infinite',
            backgroundSize: '200% 200%',
          }}
        />
      </motion.div>

      {/* Glass Card Container */}
      <GlassCard className="relative bg-white/5 backdrop-blur-2xl border-white/30">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div
                  className={`
                    relative
                    p-6
                    rounded-2xl
                    bg-gradient-to-br
                    ${kpi.bgGradient}
                    border
                    border-white/20
                    backdrop-blur-sm
                    shadow-lg
                    hover:shadow-xl
                    transition-all
                    duration-300
                  `}
                >
                  {/* Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`
                        p-3
                        rounded-xl
                        bg-white/20
                        backdrop-blur-sm
                        ${kpi.color}
                      `}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    {!loading && kpi.change !== 0 && (
                      <GlowBadge
                        value={kpi.change}
                        type={kpi.change >= 0 ? 'success' : 'danger'}
                      />
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    {kpi.title}
                  </h3>

                  {/* Value */}
                  <div className="mb-4">
                    {kpi.key === 'margine' ? (
                      <AnimatedCounter
                        value={kpi.value}
                        suffix="%"
                        decimals={1}
                        className="text-3xl font-bold text-gray-900"
                      />
                    ) : kpi.key === 'vendite' ? (
                      <AnimatedCounter
                        value={kpi.value}
                        decimals={0}
                        className="text-3xl font-bold text-gray-900"
                      />
                    ) : (
                      <AnimatedCounter
                        value={kpi.value}
                        prefix="€"
                        decimals={0}
                        className="text-3xl font-bold text-gray-900"
                      />
                    )}
                  </div>

                  {/* Sparkline */}
                  {kpi.sparkline.length > 0 && (
                    <div className="h-12 -mb-2">
                      <SparklineChart
                        data={kpi.sparkline}
                        color={
                          kpi.change >= 0
                            ? 'rgb(16, 185, 129)'
                            : 'rgb(239, 68, 68)'
                        }
                        height={48}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Filters */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {[
            { label: 'Oggi', value: 'today' as PeriodFilter },
            { label: 'Settimana', value: 'week' as PeriodFilter },
            { label: 'Mese', value: 'month' as PeriodFilter },
            { label: 'Anno', value: 'year' as PeriodFilter },
          ].map((filter, index) => {
            const isActive = periodFilter === filter.value;
            return (
              <motion.button
                key={filter.value}
                onClick={() => onPeriodChange?.(filter.value)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg backdrop-blur-sm border text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg'
                    : 'bg-white/10 border-white/20 text-gray-700 hover:bg-white/20'
                }`}
              >
                {filter.label}
              </motion.button>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
};
