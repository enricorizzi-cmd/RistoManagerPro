// GlowBadge Component - Badge with glow effect
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUpIcon, TrendingDownIcon } from '../../icons/Icons';

interface GlowBadgeProps {
  value: number;
  type?: 'success' | 'danger' | 'warning' | 'info';
  showIcon?: boolean;
  className?: string;
}

export const GlowBadge: React.FC<GlowBadgeProps> = ({
  value,
  showIcon = true,
  className = '',
}) => {
  const isPositive = value >= 0;

  const colorClasses = {
    success: 'bg-green-500/20 text-green-600 border-green-500/30',
    danger: 'bg-red-500/20 text-red-600 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  };

  const glowClasses = {
    success: 'shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    danger: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
    warning: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
    info: 'shadow-[0_0_20px_rgba(30,64,175,0.5)]',
  };

  const finalType = isPositive ? 'success' : 'danger';

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={`
        inline-flex
        items-center
        gap-1
        px-3
        py-1
        rounded-full
        text-xs
        font-semibold
        border
        backdrop-blur-sm
        ${colorClasses[finalType]}
        ${glowClasses[finalType]}
        ${className}
      `}
    >
      {showIcon &&
        (isPositive ? (
          <TrendingUpIcon className="w-3 h-3" />
        ) : (
          <TrendingDownIcon className="w-3 h-3" />
        ))}
      <span>
        {isPositive ? '+' : ''}
        {value.toFixed(1)}%
      </span>
    </motion.div>
  );
};
