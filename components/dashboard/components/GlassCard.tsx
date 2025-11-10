// GlassCard Component - Premium glassmorphism card with animations
import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = true,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      className={`
        relative
        backdrop-blur-xl
        bg-white/10
        border border-white/20
        rounded-2xl
        p-6
        shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]
        ${className}
      `}
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      }}
    >
      {children}
    </motion.div>
  );
};
