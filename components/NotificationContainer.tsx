import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { InformationCircleIcon, CheckCircleIcon, XCircleIcon } from './icons/Icons';
import { AppNotification } from '../types';

const iconMap = {
    success: <CheckCircleIcon className="h-6 w-6 text-green-500" aria-hidden="true" />,
    info: <InformationCircleIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />,
    error: <XCircleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />,
};

const colorMap = {
    success: 'border-green-400',
    info: 'border-blue-400',
    error: 'border-red-400',
};

const NotificationToast: React.FC<{ notification: AppNotification }> = ({ notification }) => {
    return (
        <div className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 ${colorMap[notification.type]}`}>
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        {iconMap[notification.type]}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NotificationContainer: React.FC = () => {
    const { notifications } = useAppContext();

    return (
        <div aria-live="assertive" className="fixed inset-0 flex flex-col items-end px-4 py-6 pointer-events-none sm:p-6 space-y-4 z-50">
            {notifications.map((notification) => (
                <NotificationToast key={notification.id} notification={notification} />
            ))}
        </div>
    );
};

export default NotificationContainer;
