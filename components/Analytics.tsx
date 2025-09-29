import React, { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import KpiCard from './ui/KpiCard';
import { CalendarIcon, UserGroupIcon, CheckCircleIcon, ClockIcon, CashIcon, TrendingUpIcon } from './icons/Icons';
import MenuEngineering from './MenuEngineering';
import SalesAnalytics from './SalesAnalytics';
import { formatCurrency } from '../utils/format';

const Analytics: React.FC = () => {
    const { kpis, sales, menuItems, loading } = useAppContext();

    const salesMetrics = useMemo(() => {
        if (!sales || !menuItems || sales.length === 0) {
            return { totalCogs: 0, grossMargin: 0 };
        }

        const menuItemsMap = new Map(menuItems.map(item => [item.id, item]));

        let totalCogs = 0;
        let totalRevenue = 0;

        for (const sale of sales) {
            totalRevenue += sale.total;
            for (const item of sale.items) {
                const menuItem = menuItemsMap.get(item.menuItemId);
                if (menuItem) {
                    totalCogs += menuItem.cost * item.quantity;
                }
            }
        }

        const grossMargin = totalRevenue - totalCogs;

        return { totalCogs, grossMargin };
    }, [sales, menuItems]);


    if (loading) return <div className="text-center p-8">Caricamento analisi...</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Analisi</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 <KpiCard title="Prenotazioni di Oggi" value={kpis.totalReservations} icon={<CalendarIcon className="w-8 h-8"/>} color="primary" />
                <KpiCard title="Coperti Totali" value={kpis.totalCovers} icon={<UserGroupIcon className="w-8 h-8"/>} color="green" />
                <KpiCard title="Occupazione" value={`${kpis.occupancyRate.toFixed(1)}%`} icon={<CheckCircleIcon className="w-8 h-8"/>} color="yellow" />
                <KpiCard title="Tasso di Assenze" value={`${kpis.noShowRate.toFixed(1)}%`} icon={<ClockIcon className="w-8 h-8"/>} color="red" />
                <KpiCard title="Costo Totale del Venduto" value={formatCurrency(salesMetrics.totalCogs)} icon={<CashIcon className="w-8 h-8"/>} color="red" />
                <KpiCard title="Margine Lordo Totale" value={formatCurrency(salesMetrics.grossMargin)} icon={<TrendingUpIcon className="w-8 h-8"/>} color="green" />
            </div>
            
            <SalesAnalytics />

            <MenuEngineering />

        </div>
    );
};

export default Analytics;


