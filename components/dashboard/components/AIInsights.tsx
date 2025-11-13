// AIInsights Component - AI insights with gradient and animations
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';
import type { AIInsight, AIPrediction } from '../types/dashboard.types';
import { formatCurrency } from '../utils/formatters';

interface AIInsightsProps {
  insights: AIInsight[];
  predictions: AIPrediction | null;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  insights,
  predictions,
}) => {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  useEffect(() => {
    if (insights.length === 0) return;

    const interval = setInterval(() => {
      setCurrentInsightIndex(prev => (prev + 1) % insights.length);
    }, 12000); // 12 secondi per dare tempo di leggere ogni insight

    return () => clearInterval(interval);
  }, [insights.length]);

  const currentInsight = insights[currentInsightIndex] || insights[0];

  const priorityColors = {
    high: 'bg-red-500/20 text-red-600 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  };

  return (
    <GlassCard>
      <div
        className="relative p-6 rounded-2xl overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(30, 64, 175, 0.1) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)',
        }}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">AI Insights</h2>

        {/* Current Insight */}
        <AnimatePresence mode="wait">
          {currentInsight ? (
            <motion.div
              key={currentInsight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="mb-6"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentInsight.title}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold border ${priorityColors[currentInsight.priority]}`}
                >
                  {currentInsight.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-700 mb-2">{currentInsight.message}</p>
              <p className="text-sm text-gray-600 italic">
                💡 {currentInsight.recommendation}
              </p>
            </motion.div>
          ) : (
            <div className="mb-6 text-gray-500">
              <p>Nessun insight disponibile al momento</p>
            </div>
          )}
        </AnimatePresence>

        {/* Predictions */}
        {predictions && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Previsioni AI
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Prossimo Mese</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(predictions.nextMonth.fatturato)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Prossimo Trimestre</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(predictions.nextQuarter.fatturato)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Confidence: {(predictions.confidence * 100).toFixed(0)}%
            </p>
          </div>
        )}

        {/* Insight Indicators */}
        {insights.length > 1 && (
          <div className="flex gap-2 justify-center mt-6">
            {insights.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentInsightIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentInsightIndex
                    ? 'bg-primary w-6'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
