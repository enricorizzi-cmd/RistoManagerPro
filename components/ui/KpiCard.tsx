
import React from 'react';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'primary' | 'green' | 'yellow' | 'red';
}

const colorClasses = {
    primary: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
};


const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color }) => {
    const { bg, text } = colorClasses[color];

    return (
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-6">
            <div className={`flex-shrink-0 w-16 h-16 ${bg} ${text} rounded-full flex items-center justify-center`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
};

export default KpiCard;
