import { useContext, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    fetchCourierOrders,
    fetchCourierShop,
    courierPickup,
    courierDeliver,
    courierNoContact
} from '../api/courierApi';
import { cardClass, pageTitleClass, btnPink, btnSecondary, statusBadgeClass } from '../utils/ui';
import { createAuthenticatedSocket } from '../utils/socketClient';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../utils/orderStatuses';
import CourierDeliveryProofModal from '../components/CourierDeliveryProofModal';
import CourierRouteMap from '../components/CourierRouteMap';
import { API_BASE } from '../config/api';

function deliveryAddress(info) {
    if (!info || typeof info !== 'object') return '—';
    return info.address || '—';
}

function deliveryPhone(info) {
    if (!info || typeof info !== 'object') return '—';
    return info.phone || '—';
}

function CourierOrders() {
    const { token, user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const [orders, setOrders] = useState([]);
    const [scope, setScope] = useState('active');
    const [shop, setShop] = useState(user?.shop || null);
    const [loading, setLoading] = useState(true);
    const [showMap, setShowMap] = useState(false);
    const [deliverOrderId, setDeliverOrderId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [data, shopData] = await Promise.all([
                fetchCourierOrders(token, scope),
                fetchCourierShop(token).catch(() => user?.shop || null)
            ]);
            setOrders(data);
            if (shopData) setShop(shopData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token, user?.shop, scope]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!token || !user) return;

        let courierUserId = user.id;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            courierUserId = payload.userId || user.id;
        } catch { /* ignore */ }

        const socket = createAuthenticatedSocket(token);
        socket.emit('join_courier', courierUserId);
        socket.on('order_assigned', () => load());
        socket.on('new_message', () => load());
        socket.on('order_status_updated', () => load());

        return () => {
            socket.off('order_assigned');
            socket.off('new_message');
            socket.off('order_status_updated');
            socket.disconnect();
        };
    }, [token, user, load]);

    const handlePickup = async (id) => {
        try {
            await courierPickup(token, id);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    const handleNoContact = async (id) => {
        if (!window.confirm('Отметить, что не удалось дозвониться до получателя?')) return;
        try {
            await courierNoContact(token, id);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    const handleDeliverSubmit = async (payload) => {
        if (!deliverOrderId) return;
        setSubmitting(true);
        try {
            await courierDeliver(token, deliverOrderId, payload);
            setDeliverOrderId(null);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        } finally {
            setSubmitting(false);
        }
    };

    const shopName = shop?.name || user?.shopName;
    const activeDeliveryCount = scope === 'active' ? orders.length : null;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className={pageTitleClass}>Мои доставки</h1>
                    {shopName && (
                        <p className="text-gray-500 text-sm">Работаете в магазине «{shopName}»</p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => { logout(); navigate('/courier/login'); }}
                    className={`${btnSecondary} px-4 py-2 text-sm`}
                >
                    Выйти
                </button>
            </div>

            {shop && (
                <div className={`${cardClass} p-4 sm:p-5 mb-6 flex gap-4 items-start`}>
                    {shop.avatar ? (
                        <img
                            src={shop.avatar.startsWith('http') ? shop.avatar : `${API_BASE}${shop.avatar}`}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center text-2xl shrink-0">
                            🏪
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="font-semibold text-lg">{shop.name}</h2>
                        <p className="text-sm text-gray-600 mt-1">📍 {shop.address}</p>
                        {shop.phone && (
                            <p className="text-sm text-gray-600 mt-1">
                                📞{' '}
                                <a href={`tel:${shop.phone}`} className="text-pink-600 hover:underline">
                                    {shop.phone}
                                </a>
                            </p>
                        )}
                        {shop.deliveryTime && (
                            <p className="text-xs text-gray-400 mt-2">Доставка: {shop.deliveryTime}</p>
                        )}
                    </div>
                </div>
            )}

            <div className="flex gap-2 mb-4 flex-wrap">
                {[
                    { id: 'active', label: 'Активные' },
                    { id: 'completed', label: 'Завершённые' },
                    { id: 'all', label: 'Все заказы' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                            setScope(tab.id);
                            setOrders([]);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                            scope === tab.id
                                ? 'bg-pink-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {scope === 'active' && (
                <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className={`${btnSecondary} w-full sm:w-auto mb-6 px-4 py-2.5 text-sm font-medium`}
                >
                    🗺️ Карта и маршрут
                    {activeDeliveryCount != null && activeDeliveryCount > 0 && (
                        <span className="ml-2 text-pink-600">({activeDeliveryCount})</span>
                    )}
                </button>
            )}

            {loading ? (
                <p className="text-center text-gray-500 py-12">Загрузка…</p>
            ) : orders.length === 0 ? (
                <div className={`${cardClass} p-10 text-center text-gray-500`}>
                    {scope === 'completed'
                        ? 'Нет завершённых доставок'
                        : scope === 'all'
                            ? 'Заказов пока нет'
                            : 'Нет активных доставок'}
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => {
                        const highlighted = highlightId && String(order.id) === highlightId;
                        const isDelivering = order.status === 'DELIVERING';
                        const canPickup = ['READY', 'CONFIRMED', 'ASSEMBLING', 'NO_CONTACT', 'PENDING'].includes(order.status);
                        const phone = deliveryPhone(order.deliveryInfo);

                        return (
                            <div
                                key={order.id}
                                className={`${cardClass} p-4 sm:p-5 ${highlighted ? 'ring-2 ring-pink-500' : ''}`}
                            >
                                <div className="flex flex-wrap justify-between gap-2 mb-3">
                                    <span className="font-bold text-lg">Заказ №{order.id}</span>
                                    <span className={statusBadgeClass(ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700')}>
                                        {ORDER_STATUS_LABELS[order.status] || order.status}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 mb-1">📍 {deliveryAddress(order.deliveryInfo)}</p>
                                <p className="text-sm text-gray-600 mb-3">
                                    📞{' '}
                                    {phone !== '—' ? (
                                        <a href={`tel:${phone}`} className="text-pink-600 hover:underline">{phone}</a>
                                    ) : (
                                        phone
                                    )}
                                </p>
                                <p className="text-sm font-medium mb-4">{order.total?.toLocaleString('ru-RU')} ₽</p>

                                {order.status === 'NO_CONTACT' && scope === 'active' && (
                                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3">
                                        Магазин и клиент видят, что вы не дозвонились. Повторите попытку или заберите заказ снова.
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        to={`/courier/orders/${order.id}/chat`}
                                        className={`${btnSecondary} px-4 py-2 text-sm`}
                                    >
                                        💬 Клиент
                                    </Link>
                                    <Link
                                        to={`/courier/orders/${order.id}/chat?tab=shop`}
                                        className={`${btnSecondary} px-4 py-2 text-sm`}
                                    >
                                        🏪 Магазин
                                    </Link>

                                    {scope === 'active' && canPickup && !isDelivering && (
                                        <button
                                            type="button"
                                            onClick={() => handlePickup(order.id)}
                                            className={`${btnPink} px-4 py-2 text-sm`}
                                        >
                                            Забрал заказ
                                        </button>
                                    )}

                                    {scope === 'active' && isDelivering && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setDeliverOrderId(order.id)}
                                                className={`${btnPink} px-4 py-2 text-sm`}
                                            >
                                                Доставлен
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleNoContact(order.id)}
                                                className={`${btnSecondary} px-4 py-2 text-sm border-amber-200 text-amber-900`}
                                            >
                                                Не дозвонился
                                            </button>
                                        </>
                                    )}

                                    {scope === 'active' && canPickup && !isDelivering && order.status !== 'NO_CONTACT' && (
                                        <button
                                            type="button"
                                            onClick={() => handleNoContact(order.id)}
                                            className={`${btnSecondary} px-4 py-2 text-sm`}
                                        >
                                            Не дозвонился
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showMap && token && (
                <CourierRouteMap
                    token={token}
                    orders={orders}
                    shop={shop}
                    onClose={() => setShowMap(false)}
                />
            )}

            {deliverOrderId && (
                <CourierDeliveryProofModal
                    orderId={deliverOrderId}
                    submitting={submitting}
                    onClose={() => setDeliverOrderId(null)}
                    onSubmit={handleDeliverSubmit}
                />
            )}
        </div>
    );
}

export default CourierOrders;
