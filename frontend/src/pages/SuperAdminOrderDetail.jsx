import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    fetchSuperAdminOrder,
    fetchSuperAdminOrderMessages,
    updateSuperAdminOrderStatus
} from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import OrderDetailsPanel from '../components/OrderDetailsPanel';
import { getOrderDeliverySummary } from '../utils/orderDeliveryDisplay';
import { ORDER_STATUS_LABELS } from '../utils/orderStatuses';
import { cardClass } from '../utils/ui';
import { mediaUrl } from '../utils/media';

const STATUSES = Object.keys(ORDER_STATUS_LABELS);

export default function SuperAdminOrderDetail() {
    const { orderId } = useParams();
    const { token } = useContext(AuthContext);
    const [order, setOrder] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chatChannel, setChatChannel] = useState('SHOP');

    const load = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await fetchSuperAdminOrder(token, orderId);
            setOrder(data);
            const msgs = await fetchSuperAdminOrderMessages(token, orderId, chatChannel);
            setMessages(msgs);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [token, orderId, chatChannel]);

    const changeStatus = async (status) => {
        if (!window.confirm(`Сменить статус на «${ORDER_STATUS_LABELS[status]}»?`)) return;
        try {
            await updateSuperAdminOrderStatus(token, orderId, status);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    if (loading) {
        return (
            <SuperAdminLayout title={`Заказ №${orderId}`}>
                <p className="text-gray-500">Загрузка…</p>
            </SuperAdminLayout>
        );
    }

    if (!order) {
        return (
            <SuperAdminLayout title="Заказ не найден">
                <Link to="/super-admin/orders" className="text-violet-600">← К списку</Link>
            </SuperAdminLayout>
        );
    }

    const summary = getOrderDeliverySummary(order);
    const statusHistory = order.statusHistory || [];

    return (
        <SuperAdminLayout title={`Заказ №${order.id}`}>
            <Link to="/super-admin/orders" className="text-sm text-violet-600 hover:underline mb-4 inline-block">
                ← Все заказы
            </Link>

            <div className={`${cardClass} p-4 sm:p-6 mb-6`}>
                <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                    <div>
                        <p className="text-sm text-gray-500">
                            {order.shop?.name} · {order.user?.name} ({order.user?.email})
                        </p>
                        {order.courier && (
                            <p className="text-sm text-gray-600 mt-1">
                                🚴 Курьер: {order.courier.name}
                                {order.courier.phone && ` · ${order.courier.phone}`}
                            </p>
                        )}
                    </div>
                    <select
                        className="border rounded-xl px-3 py-2 text-sm"
                        value={order.status}
                        onChange={(e) => changeStatus(e.target.value)}
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                        ))}
                    </select>
                </div>

                <OrderDetailsPanel
                    order={order}
                    summary={summary}
                    statusHistory={statusHistory}
                    statusLabels={ORDER_STATUS_LABELS}
                />
            </div>

            <div className={`${cardClass} p-4 sm:p-6 mb-6`}>
                <h2 className="font-semibold mb-3">
                    Чат <span className="text-xs font-normal text-gray-500">(только просмотр)</span>
                </h2>
                <div className="flex gap-2 mb-3">
                    {['SHOP', 'COURIER'].map((ch) => (
                        <button
                            key={ch}
                            type="button"
                            onClick={() => setChatChannel(ch)}
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                                chatChannel === ch
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            {ch === 'SHOP' ? 'Клиент ↔ магазин' : 'Курьер'}
                        </button>
                    ))}
                </div>
                <ul className="max-h-64 overflow-y-auto space-y-2 text-sm">
                    {messages.length === 0 ? (
                        <li className="text-gray-500">Сообщений нет</li>
                    ) : (
                        messages.map((m) => (
                            <li key={m.id} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                <span className="text-xs text-gray-500">
                                    {m.user?.name || '—'} ·{' '}
                                    {new Date(m.createdAt).toLocaleString('ru-RU')}
                                </span>
                                {m.text && <p className="mt-1">{m.text}</p>}
                                {m.imageUrl && (
                                    <img
                                        src={mediaUrl(m.imageUrl)}
                                        alt=""
                                        className="mt-2 max-h-32 rounded-lg"
                                    />
                                )}
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {order.review && (
                <div className={`${cardClass} p-4 text-sm`}>
                    <h2 className="font-semibold mb-2">Отзыв</h2>
                    <p>★ {order.review.rating}/5</p>
                    {order.review.text && <p className="mt-1 text-gray-700">{order.review.text}</p>}
                    {order.review.shopReply && (
                        <p className="mt-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                            Ответ магазина: {order.review.shopReply}
                        </p>
                    )}
                </div>
            )}
        </SuperAdminLayout>
    );
}
