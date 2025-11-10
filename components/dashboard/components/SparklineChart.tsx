// SparklineChart Component - Mini animated sparkline chart
import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  showDot?: boolean;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color = '#1E40AF',
  height = 40,
  showDot = false,
}) => {
  const chartData = data.map((value, index) => ({
    value,
    index,
  }));

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue || 1;

  // Normalize data for better visualization
  const normalizedData = chartData.map(item => ({
    ...item,
    normalizedValue: ((item.value - minValue) / range) * 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={normalizedData}>
          <Line
            type="monotone"
            dataKey="normalizedValue"
            stroke={color}
            strokeWidth={2}
            dot={showDot}
            activeDot={false}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
