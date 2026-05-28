import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from '../api/notificationsApi';
import { dispatchNotificationsUpdated, dispatchOrdersUpdated } from '../utils/notifications';
import { notificationTargetLink } from '../utils/notificationLinks';
import { cardClass, pageTitleClass } from '../utils/ui';

function ShopNotifications() {
    const { token, user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            const data = await fetchNotifications(token);
            const sorted = [...data].sort((a, b) => {
                const aUnread = !a.readAt;
                const bUnread = !b.readAt;
                if (aUnread !== bUnread) return aUnread ? -1 : 1;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });
            setNotifications(sorted);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!token || !user) return;
        load();
        const onUpdate = () => load();
        window.addEventListener('notifications-updated', onUpdate);
        return () => window.removeEventListener('notifications-updated', onUpdate);
    }, [token, user, load]);

    const handleRead = async (id) => {
        try {
            await markNotificationRead(token, id);
            dispatchNotificationsUpdated();
            dispatchOrdersUpdated();
            await load();
        } catch (e) {
            console.error(e);
        }
    };

    const markAllAsRead = async () => {
        try {
            await markAllNotificationsRead(token);
            setNotifications(prev => prev.map(n => ({
                ...n,
                readAt: n.readAt || new Date().toISOString(),
                count: 1
            })));
            dispatchNotificationsUpdated();
            dispatchOrdersUpdated();
            await load();
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.error || 'Не удалось отметить уведомления');
        }
    };

    if (loading) {
        return <div className="text-center py-20">Загрузка уведомлений...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
                <h1 className={pageTitleClass}>🛎️ Уведомления магазина</h1>
                <div className="flex gap-4 text-sm">
                    <Link to="/shop/settings/notifications" className="text-pink-600 hover:underline">
                        Настройки
                    </Link>
                    <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-pink-600 hover:underline font-medium"
                    >
                        Отметить все как прочитанные
                    </button>
                </div>
            </div>

            {notifications.length === 0 ? (
                <div className={`${cardClass} p-12 text-center text-gray-500`}>
                    Пока нет уведомлений
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map(notif => {
                        const isNew = !notif.readAt;
                        return (
                            <Link
                                key={notif.id}
                                to={notificationTargetLink(notif, { isShop: true })}
                                onClick={() => isNew && handleRead(notif.id)}
                                className={`block ${cardClass} p-5 sm:p-6 hover:shadow-md transition-all border-l-4 ${
                                    isNew ? 'border-red-500 bg-red-50' : 'border-transparent'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="text-2xl sm:text-3xl shrink-0">
                                        {notif.type === 'ORDER' ? '🛒' : notif.type === 'CHAT' ? '💬' : '📦'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between gap-2 items-start">
                                            <div className="font-semibold text-base sm:text-lg">{notif.title}</div>
                                            {isNew && notif.count > 1 && (
                                                <span className="bg-red-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shrink-0">
                                                    {notif.count}
                                                </span>
                                            )}
                                        </div>
                                        <div className={`mt-2 font-medium text-sm sm:text-base ${isNew ? 'text-red-600' : 'text-gray-600'}`}>
                                            {notif.message}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-3">
                                            {new Date(notif.updatedAt).toLocaleString('ru-RU')}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default ShopNotifications;
