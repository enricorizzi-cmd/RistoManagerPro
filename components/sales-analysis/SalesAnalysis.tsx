import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { ChartLineIcon, LinkIcon, UploadIcon } from '../icons/Icons';
import ImportTab from './ImportTab';
import LinksTab from './LinksTab';
import DashboardTab from './DashboardTab';

type SalesAnalysisTab = 'import' | 'links' | 'dashboard';

const SalesAnalysis: React.FC = () => {
  const { currentLocation } = useAppContext();
  const [activeTab, setActiveTab] = useState<SalesAnalysisTab>('import');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentLocation?.id || currentLocation.id === 'all') {
      setError("Seleziona una location per visualizzare l'analisi vendite");
    } else {
      setError(null);
    }
  }, [currentLocation]);

  const tabs = [
    {
      key: 'import' as SalesAnalysisTab,
      label: 'Import Dati',
      icon: UploadIcon,
    },
    {
      key: 'links' as SalesAnalysisTab,
      label: 'Gestione Collegamenti',
      icon: LinkIcon,
    },
    {
      key: 'dashboard' as SalesAnalysisTab,
      label: 'Dashboard Analisi',
      icon: ChartLineIcon,
    },
  ];

  if (error && !currentLocation?.id) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Analisi Vendite
        </h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">
          Importa dati di vendita dal gestionale, collega i piatti alle ricette
          e analizza le performance
        </p>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-t-xl text-xs md:text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'import' && currentLocation?.id && (
        <ImportTab locationId={currentLocation.id} />
      )}

      {activeTab === 'links' && currentLocation?.id && (
        <LinksTab locationId={currentLocation.id} />
      )}

      {activeTab === 'dashboard' && currentLocation?.id && (
        <DashboardTab locationId={currentLocation.id} />
      )}
    </div>
  );
};

export default SalesAnalysis;
