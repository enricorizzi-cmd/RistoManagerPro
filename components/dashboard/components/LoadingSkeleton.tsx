// LoadingSkeleton Component - Animated skeleton loader
import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = '20px',
  className = '',
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.1,
          }}
          className={`
            bg-gray-200
            rounded-lg
            ${className}
          `}
          style={{ width, height }}
        />
      ))}
    </>
  );
};
