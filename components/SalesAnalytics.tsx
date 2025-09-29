
import React, { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/format';
import { format, subDays } from 'date-fns';
import KpiCard from './ui/KpiCard';
import { CashIcon, TrendingUpIcon } from './icons/Icons';

interface DailySale {
    date: string;
    total: number;
}

const SalesAnalytics: React.FC = () => {
    const { sales } = useAppContext();

    const salesData = useMemo(() => {
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const averageSaleValue = sales.length > 0 ? totalRevenue / sales.length : 0;

        const salesByDay = new Map<string, number>();
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = subDays(today, i);
            const formattedDate = format(date, 'MMM d');
            salesByDay.set(formattedDate, 0);
        }

        sales.forEach(sale => {
            const saleDate = new Date(sale.createdAt);
            if (saleDate >= subDays(today, 30)) {
                const formattedDate = format(saleDate, 'MMM d');
                const currentTotal = salesByDay.get(formattedDate) || 0;
                salesByDay.set(formattedDate, currentTotal + sale.total);
            }
        });

        const chartData: DailySale[] = Array.from(salesByDay.entries())
            .map(([date, total]) => ({ date, total }))
            .reverse();
        
        return {
            totalRevenue,
            averageSaleValue,
            chartData
        }

    }, [sales]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800">Andamento Vendite</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KpiCard title="Ricavi Totali" value={formatCurrency(salesData.totalRevenue)} icon={<CashIcon className="w-8 h-8" />} color="primary" />
                <KpiCard title="Valore Scontrino Medio" value={formatCurrency(salesData.averageSaleValue)} icon={<TrendingUpIcon className="w-8 h-8" />} color="green" />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Trend Vendite (Ultimi 30 Giorni)</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <LineChart data={salesData.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#2E86C1" strokeWidth={2} name="Vendite Giornaliere" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SalesAnalytics;






