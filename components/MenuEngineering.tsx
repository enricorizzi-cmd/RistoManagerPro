
import React, { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { MenuItem } from '../types';
import { StarIcon, PuzzlePieceIcon, TruckIcon, TrashIcon, TrendingUpIcon, CashIcon } from './icons/Icons';
import { formatCurrency } from '../utils/format';

interface AnalyzedMenuItem extends MenuItem {
    quantitySold: number;
    contributionMargin: number;
}

interface CategoryPopularity {
    name: string;
    totalSold: number;
}

interface MenuEngineeringData {
    stars: AnalyzedMenuItem[];
    plowhorses: AnalyzedMenuItem[];
    puzzles: AnalyzedMenuItem[];
    dogs: AnalyzedMenuItem[];
    popularityRanking: AnalyzedMenuItem[];
    categoryPopularity: CategoryPopularity[];
}

const QuadrantCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    items: AnalyzedMenuItem[];
    bgColor: string;
    textColor: string;
}> = ({ title, description, icon, items, bgColor, textColor }) => {
    return (
        <div className={`bg-white p-6 rounded-xl shadow-md border-t-4 ${bgColor}`}>
            <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100`}>
                    {icon}
                </div>
                <div>
                    <h3 className={`text-xl font-bold ${textColor}`}>{title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>
            </div>
            <div className="mt-4 space-y-3">
                {items.length > 0 ? items.map(item => (
                    <div key={item.id} className="bg-gray-50 p-3 rounded-md">
                        <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                        <div className="flex justify-between items-center text-xs text-gray-600 mt-1">
                            <span className="flex items-center"><TrendingUpIcon className="w-3.5 h-3.5 mr-1" /> Venduti: {item.quantitySold}</span>
                            <span className="flex items-center"><CashIcon className="w-3.5 h-3.5 mr-1" /> Margine: {formatCurrency(item.contributionMargin)}</span>
                        </div>
                    </div>
                )) : <p className="text-sm text-gray-400 text-center py-4">Nessun piatto in questa categoria.</p>}
            </div>
        </div>
    );
};

const MenuEngineering: React.FC = () => {
    const { menuItems, sales } = useAppContext();

    const analysis = useMemo<MenuEngineeringData>(() => {
        const emptyState = { stars: [], plowhorses: [], puzzles: [], dogs: [], popularityRanking: [], categoryPopularity: [] };
        if (menuItems.length === 0 || sales.length === 0) {
            return emptyState;
        }

        const itemAnalysis = new Map<string, { quantitySold: number; totalMargin: number }>();

        // Aggregate sales data
        sales.forEach(sale => {
            sale.items.forEach(orderItem => {
                const menuItem = menuItems.find(mi => mi.id === orderItem.menuItemId);
                if (menuItem) {
                    const existing = itemAnalysis.get(menuItem.id) || { quantitySold: 0, totalMargin: 0 };
                    existing.quantitySold += orderItem.quantity;
                    existing.totalMargin += (menuItem.price - menuItem.cost) * orderItem.quantity;
                    itemAnalysis.set(menuItem.id, existing);
                }
            });
        });

        const analyzedItems: AnalyzedMenuItem[] = menuItems.map(item => {
            const stats = itemAnalysis.get(item.id) || { quantitySold: 0, totalMargin: 0 };
            return {
                ...item,
                quantitySold: stats.quantitySold,
                contributionMargin: item.price - item.cost
            };
        }).filter(item => item.quantitySold > 0);

        if(analyzedItems.length === 0) {
             return emptyState;
        }

        // Calculate popularity rankings
        const popularityRanking = [...analyzedItems].sort((a, b) => b.quantitySold - a.quantitySold);
        
        const categoryTotals: { [key: string]: number } = {};
        analyzedItems.forEach(item => {
            categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.quantitySold;
        });
        const categoryPopularity = Object.entries(categoryTotals)
            .map(([name, totalSold]) => ({ name, totalSold }))
            .sort((a,b) => b.totalSold - a.totalSold);

        // Calculate averages for matrix
        const totalItemsSold = analyzedItems.reduce((sum, item) => sum + item.quantitySold, 0);
        const averagePopularity = totalItemsSold / analyzedItems.length;
        const totalContributionMargin = analyzedItems.reduce((sum, item) => sum + item.contributionMargin * item.quantitySold, 0);
        const averageMargin = totalContributionMargin / totalItemsSold;

        const result: MenuEngineeringData = { ...emptyState };

        analyzedItems.forEach(item => {
            const popular = item.quantitySold >= averagePopularity;
            const profitable = item.contributionMargin >= averageMargin;

            if (popular && profitable) result.stars.push(item);
            else if (popular && !profitable) result.plowhorses.push(item);
            else if (!popular && profitable) result.puzzles.push(item);
            else result.dogs.push(item);
        });
        
        Object.values(result).forEach(arr => Array.isArray(arr) && arr.sort((a, b) => b.quantitySold - a.quantitySold));

        result.popularityRanking = popularityRanking;
        result.categoryPopularity = categoryPopularity;

        return result;

    }, [menuItems, sales]);

    return (
        <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Matrice del Menu</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QuadrantCard
                    title="Stelle"
                    description="Alta popolaritÃ , alto margine. I tuoi piatti migliori. Promuovili!"
                    icon={<StarIcon className="w-6 h-6 text-yellow-500" />}
                    items={analysis.stars}
                    bgColor="border-yellow-400"
                    textColor="text-yellow-600"
                />
                <QuadrantCard
                    title="Puzzle"
                    description="Bassa popolaritÃ , alto margine. Redditizi ma necessitano di piÃ¹ visibilitÃ ."
                    icon={<PuzzlePieceIcon className="w-6 h-6 text-blue-500" />}
                    items={analysis.puzzles}
                    bgColor="border-blue-400"
                    textColor="text-blue-600"
                />
                <QuadrantCard
                    title="Cavalli di Battaglia"
                    description="Alta popolaritÃ , basso margine. I preferiti dai clienti, ma possono essere piÃ¹ redditizi."
                    icon={<TruckIcon className="w-6 h-6 text-green-500" />}
                    items={analysis.plowhorses}
                    bgColor="border-green-400"
                    textColor="text-green-600"
                />
                <QuadrantCard
                    title="Cani"
                    description="Bassa popolaritÃ , basso margine. Valuta se modificarli o rimuoverli."
                    icon={<TrashIcon className="w-6 h-6 text-red-500" />}
                    items={analysis.dogs}
                    bgColor="border-red-400"
                    textColor="text-red-600"
                />
            </div>

            {analysis.popularityRanking.length > 0 && (
                 <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">PopolaritÃ  Piatti del Menu</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Piatti piÃ¹ Venduti</h3>
                            <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                {analysis.popularityRanking.map((item, index) => (
                                    <li key={item.id} className="flex justify-between items-center text-sm p-2 rounded-md even:bg-gray-50">
                                        <span className="text-gray-800 font-medium truncate pr-2">
                                            <span className="text-gray-400 font-normal w-8 inline-block">{index + 1}.</span> 
                                            {item.name}
                                        </span>
                                        <span className="font-bold text-primary-700 flex-shrink-0">{item.quantitySold} venduti</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">PopolaritÃ  per Categoria</h3>
                            <ul className="space-y-2">
                                {analysis.categoryPopularity.map(category => (
                                    <li key={category.name} className="flex justify-between items-center text-sm p-2 rounded-md even:bg-gray-50">
                                        <span className="text-gray-800 font-medium">{category.name}</span>
                                        <span className="font-bold text-primary-700">{category.totalSold} venduti</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuEngineering;
