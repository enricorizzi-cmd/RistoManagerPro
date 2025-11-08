import React, { useState, useEffect } from 'react';
import { getDashboardData } from '../../services/salesAnalysisApi';
import { useAppContext } from '../../contexts/AppContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface DashboardTabProps {
  locationId: string;
}

const DashboardTab: React.FC<DashboardTabProps> = ({ locationId }) => {
  const { showNotification } = useAppContext();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [granularity, setGranularity] = useState<
    'mese' | 'trimestre' | 'quadrimestre' | 'semestre' | 'anno' | 'totale'
  >('anno');
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, granularity, periodYear, periodMonth]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getDashboardData(locationId, {
        granularity,
        periodYear,
        periodMonth,
      });
      setDashboardData(data);
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : 'Errore nel caricamento dei dati',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884d8',
    '#82ca9d',
  ];

  if (loading || !dashboardData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Granularità
            </label>
            <select
              value={granularity}
              onChange={e => setGranularity(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="mese">Mese</option>
              <option value="trimestre">Trimestre</option>
              <option value="quadrimestre">Quadrimestre</option>
              <option value="semestre">Semestre</option>
              <option value="anno">Anno</option>
              <option value="totale">Totale</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anno
            </label>
            <input
              type="number"
              value={periodYear}
              onChange={e => setPeriodYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mese
            </label>
            <select
              value={periodMonth}
              onChange={e => setPeriodMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString('it-IT', {
                    month: 'long',
                  })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Valore Totale</div>
          <div className="text-2xl font-bold text-gray-900">
            € {dashboardData.kpis.totalValue.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Quantità Totale</div>
          <div className="text-2xl font-bold text-gray-900">
            {dashboardData.kpis.totalQuantity.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Piatti Unici</div>
          <div className="text-2xl font-bold text-gray-900">
            {dashboardData.kpis.uniqueDishes}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Ticket Medio</div>
          <div className="text-2xl font-bold text-gray-900">
            € {dashboardData.kpis.averageTicket.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Andamento Vendite</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.charts.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#0088FE"
                name="Totale"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Distribuzione per Categoria
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.charts.categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) =>
                  `${category}: ${percentage.toFixed(1)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dashboardData.charts.categoryDistribution.map(
                  (entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  )
                )}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Dishes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Top 10 Piatti</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dashboardData.charts.topDishes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="dishName"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#0088FE" name="Valore (€)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardTab;
