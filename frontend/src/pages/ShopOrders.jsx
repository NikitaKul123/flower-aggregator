import { useState, useEffect, useContext, Fragment, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { createAuthenticatedSocket } from '../utils/socketClient';
import { AuthContext } from '../context/AuthContext';
import { cardClass, pageTitleClass, btnPink, btnSecondary, statusBadgeClass, inputClass, labelClass } from '../utils/ui';
import {
    loadFilters,
    saveFilters,
    filtersToQuery,
    defaultShopFilters,
    SHOP_KEY
} from '../utils/orderFiltersStorage';
import { orderCardHighlightClass, orderRowHighlightClass, orderTitleHighlightClass } from '../utils/orderHighlight';
import { fetchShopCouriers, assignOrderCourier } from '../api/courierApi';
import { API_BASE } from '../config/api';
import OrderDetailsPanel, { OrderDeliveryBadge } from '../components/OrderDetailsPanel';
import { getOrderDeliverySummary } from '../utils/orderDeliveryDisplay';
import ShopReviewReplyBox from '../components/ShopReviewReplyBox';
import ShopOrderNotes from '../components/ShopOrderNotes';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../utils/orderStatuses';

const statusLabels = { ...ORDER_STATUS_LABELS, READY: 'Готов к выдаче' };
const statusColors = ORDER_STATUS_COLORS;

function ShopOrders() {
    const { token } = useContext(AuthContext);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openedOrder, setOpenedOrder] = useState(null);
    const [selected, setSelected] = useState([]);
    const [statusHistory, setStatusHistory] = useState([]);
    const [bulkStatus, setBulkStatus] = useState('CONFIRMED');
    const [bulkComment, setBulkComment] = useState('');
    const [statusComment, setStatusComment] = useState('');
    const [filters, setFilters] = useState(() => loadFilters(SHOP_KEY, defaultShopFilters));
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [highlightedIds, setHighlightedIds] = useState(() => new Set());
    const [couriers, setCouriers] = useState([]);

    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const markOrderSeen = (orderId) => {
        setHighlightedIds(prev => {
            if (!prev.has(orderId)) return prev;
            const next = new Set(prev);
            next.delete(orderId);
            return next;
        });
    };

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const qs = filtersToQuery(filters);
            const res = await axios.get(
                `${API_BASE}/api/shop/orders${qs ? `?${qs}` : ''}`,
                auth
            );
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, filters]);

    useEffect(() => {
        saveFilters(SHOP_KEY, filters);
    }, [filters]);

    useEffect(() => {
        if (!token) return;
        fetchShopCouriers(token).then(setCouriers).catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchOrders();

        const onOrdersUpdated = () => fetchOrders();
        window.addEventListener('orders-updated', onOrdersUpdated);

        if (!token) {
            return () => window.removeEventListener('orders-updated', onOrdersUpdated);
        }

        let shopId;
        try {
            shopId = JSON.parse(atob(token.split('.')[1])).shopId;
        } catch {
            return () => window.removeEventListener('orders-updated', onOrdersUpdated);
        }

        const socket = createAuthenticatedSocket(token);
        if (shopId) socket.emit('join_shop', shopId);

        socket.on('new_order', (order) => {
            if (!order?.id) return;
            setOrders(prev => {
                if (prev.some(o => o.id === order.id)) return prev;
                return [{ ...order, unreadMessageCount: order.unreadMessageCount ?? 0 }, ...prev];
            });
            setHighlightedIds(prev => new Set(prev).add(order.id));
        });

        socket.on('new_message', () => fetchOrders());
        socket.on('orders_unread_updated', (payload) => {
            if (payload?.orderId) {
                setOrders(prev =>
                    prev.map(o =>
                        o.id === payload.orderId ? { ...o, unreadMessageCount: 0 } : o
                    )
                );
            } else {
                fetchOrders();
            }
        });

        socket.on('order_status_updated', ({ orderId, status }) => {
            if (!orderId || !status) return;
            setOrders(prev =>
                prev.map(o => (o.id === orderId ? { ...o, status } : o))
            );
        });

        return () => {
            window.removeEventListener('orders-updated', onOrdersUpdated);
            socket.off('new_order');
            socket.off('new_message');
            socket.off('orders_unread_updated');
            socket.off('order_status_updated');
            socket.disconnect();
        };
    }, [fetchOrders, token]);

    const loadHistory = async (orderId) => {
        try {
            const res = await axios.get(
                `${API_BASE}/api/shop/orders/${orderId}/status-history`,
                auth
            );
            setStatusHistory(res.data);
        } catch {
            setStatusHistory([]);
        }
    };

    const toggleOpen = (orderId) => {
        markOrderSeen(orderId);
        if (openedOrder === orderId) {
            setOpenedOrder(null);
            setStatusHistory([]);
        } else {
            setOpenedOrder(orderId);
            loadHistory(orderId);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        const ok = window.confirm(`Изменить статус на "${statusLabels[newStatus]}"?`);
        if (!ok) return;
        try {
            await axios.put(
                `${API_BASE}/api/shop/orders/${orderId}/status`,
                { status: newStatus, comment: statusComment || undefined },
                auth
            );
            setStatusComment('');
            fetchOrders();
            if (openedOrder === orderId) loadHistory(orderId);
        } catch {
            alert('Ошибка обновления');
        }
    };

    const bulkUpdate = async () => {
        if (!selected.length) return alert('Выберите заказы');
        try {
            await axios.put(
                `${API_BASE}/api/shop/orders/bulk-status`,
                { orderIds: selected, status: bulkStatus, comment: bulkComment || undefined },
                auth
            );
            setSelected([]);
            setBulkComment('');
            fetchOrders();
        } catch {
            alert('Ошибка массового обновления');
        }
    };

    const exportCsv = async () => {
        try {
            const qs = filtersToQuery(filters);
            const res = await axios.get(
                `${API_BASE}/api/shop/orders/export${qs ? `?${qs}` : ''}`,
                { ...auth, responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'orders.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Ошибка экспорта');
        }
    };

    const toggleSelect = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selected.length === orders.length) setSelected([]);
        else setSelected(orders.map(o => o.id));
    };

    const renderOrderDetails = (order) => {
        const summary = getOrderDeliverySummary(order);
        const extraSections = (
            <>
                <ShopOrderNotes
                    token={token}
                    order={order}
                    onSaved={updated =>
                        setOrders(prev => prev.map(o => (o.id === order.id ? { ...o, ...updated } : o)))
                    }
                />
                {order.review ? (
            <ShopReviewReplyBox
                token={token}
                review={order.review}
                compact
                onUpdated={updated =>
                    setOrders(prev =>
                        prev.map(o => (o.id === order.id ? { ...o, review: updated } : o))
                    )
                }
            />
        ) : order.status === 'DELIVERED' ? (
            <p className="text-sm text-gray-500 italic">Клиент ещё не оставил отзыв</p>
        ) : null}
            </>
        );

        return (
            <OrderDetailsPanel
                order={order}
                summary={summary}
                statusHistory={statusHistory}
                statusLabels={statusLabels}
                extraSections={extraSections}
            />
        );
    };

    const assignCourier = async (orderId, courierUserId) => {
        try {
            const data = await assignOrderCourier(
                token,
                orderId,
                courierUserId === '' ? null : Number(courierUserId)
            );
            setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...data.order } : o)));
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    const renderActions = (order) => (
        <div className="flex flex-wrap gap-2 items-center">
            {!order.isPickup && (
                <select
                    value={order.courierId || ''}
                    onChange={(e) => assignCourier(order.id, e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm max-w-[180px]"
                    title="Курьер"
                >
                    <option value="">Курьер…</option>
                    {couriers.filter(c => c.isActive).map(c => (
                        <option key={c.userId} value={c.userId}>
                            {c.user.name}
                        </option>
                    ))}
                </select>
            )}
            {order.isPickup && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Самовывоз</span>
            )}
            <select
                value={order.status}
                onChange={(e) => updateStatus(order.id, e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
            >
                {Object.keys(statusLabels).map(k => (
                    <option key={k} value={k}>{statusLabels[k]}</option>
                ))}
            </select>
            <Link
                to={`/shop/orders/${order.id}/chat`}
                className={`${btnPink} px-3 py-2 text-sm relative`}
                onClick={() => markOrderSeen(order.id)}
            >
                💬 Клиент
                {Number(order.unreadMessageCount) > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                        {order.unreadMessageCount}
                    </span>
                )}
            </Link>
            {!order.isPickup && order.courierId && (
                <Link
                    to={`/shop/orders/${order.id}/chat?channel=shop-courier`}
                    className={`${btnSecondary} px-3 py-2 text-sm`}
                >
                    🛵 Курьер
                </Link>
            )}
            <button type="button" onClick={() => toggleOpen(order.id)} className={`${btnSecondary} px-3 py-2 text-sm`}>
                {openedOrder === order.id ? 'Скрыть' : 'Подробнее'}
            </button>
        </div>
    );

    if (loading && !orders.length) {
        return <div className="text-center py-16 text-gray-500">Загрузка...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className={pageTitleClass}>Заказы магазина</h1>
                <div className="flex flex-wrap gap-4">
                    <Link to="/shop/reviews" className="text-pink-600 hover:underline text-sm font-medium">
                        💬 Отзывы и ответы
                    </Link>
                    <Link to="/shop/couriers" className="text-pink-600 hover:underline text-sm font-medium">
                        🚴 Курьеры
                    </Link>
                </div>
            </div>

            <div className="mb-6 p-4 rounded-2xl bg-pink-50 border border-pink-100 text-sm text-pink-950">
                <p className="font-semibold mb-1">Как ответить на отзыв</p>
                <p className="text-pink-900/90">
                    Откройте заказ → «Подробнее» — внизу блок «Отзыв клиента». Или все отзывы сразу:{' '}
                    <Link to="/shop/reviews" className="underline font-medium">Отзывы и ответы</Link>
                    {' '}(дашборд → плитка «Отзывы»).
                </p>
            </div>

            <div className={`${cardClass} p-4 sm:p-6 mb-6 space-y-4`}>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                        className={`${inputClass()} flex-1`}
                        placeholder="Поиск: №, имя, телефон"
                    />
                    <button
                        type="button"
                        onClick={() => setFiltersOpen(v => !v)}
                        className={`${btnSecondary} px-5 py-2.5 text-sm shrink-0`}
                    >
                        {filtersOpen ? 'Скрыть фильтры' : 'Фильтры'}
                    </button>
                </div>
                {filtersOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                    <select
                        value={filters.status}
                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                        className={inputClass()}
                    >
                        <option value="ALL">Все статусы</option>
                        {Object.keys(statusLabels).map(k => (
                            <option key={k} value={k}>{statusLabels[k]}</option>
                        ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm px-2">
                        <input
                            type="checkbox"
                            checked={filters.onlyUnread}
                            onChange={e => setFilters({ ...filters, onlyUnread: e.target.checked })}
                        />
                        Только с непрочитанными
                    </label>
                    <input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} className={inputClass()} />
                    <input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} className={inputClass()} />
                    <input type="number" placeholder="Сумма от" value={filters.minTotal} onChange={e => setFilters({ ...filters, minTotal: e.target.value })} className={inputClass()} />
                    <input type="number" placeholder="Сумма до" value={filters.maxTotal} onChange={e => setFilters({ ...filters, maxTotal: e.target.value })} className={inputClass()} />
                </div>
                )}
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={fetchOrders} className={`${btnPink} px-4 py-2 text-sm`}>Применить</button>
                    <button type="button" onClick={() => setFilters({ ...defaultShopFilters })} className={`${btnSecondary} px-4 py-2 text-sm`}>Сбросить</button>
                    <button type="button" onClick={exportCsv} className={`${btnSecondary} px-4 py-2 text-sm`}>Экспорт CSV (Excel)</button>
                </div>
            </div>

            <div className={`${cardClass} p-4 sm:p-6 mb-6`}>
                <h2 className="font-semibold mb-3">Массовые действия</h2>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                    <div>
                        <label className={labelClass}>Статус</label>
                        <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className={inputClass()}>
                            {Object.keys(statusLabels).map(k => (
                                <option key={k} value={k}>{statusLabels[k]}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className={labelClass}>Комментарий</label>
                        <input value={bulkComment} onChange={e => setBulkComment(e.target.value)} className={inputClass()} placeholder="Курьер выехал..." />
                    </div>
                    <button type="button" onClick={bulkUpdate} className={`${btnPink} px-4 py-2 text-sm`}>
                        Применить к выбранным ({selected.length})
                    </button>
                </div>
                <div className="mt-3">
                    <label className={labelClass}>Комментарий к одиночной смене статуса</label>
                    <input value={statusComment} onChange={e => setStatusComment(e.target.value)} className={inputClass()} placeholder="Необязательно" />
                </div>
            </div>

            {orders.length === 0 ? (
                <div className={`${cardClass} p-12 text-center text-gray-500`}>Заказов не найдено</div>
            ) : (
                <>
                    <div className="md:hidden space-y-4">
                        <label className="flex items-center gap-2 text-sm mb-2">
                            <input type="checkbox" checked={selected.length === orders.length && orders.length > 0} onChange={toggleSelectAll} />
                            Выбрать все
                        </label>
                        {orders.map(order => {
                            const isHighlighted = highlightedIds.has(order.id);
                            return (
                            <div
                                key={order.id}
                                className={`${cardClass} p-4 sm:p-6 ${orderCardHighlightClass(isHighlighted)}`}
                                onClick={() => markOrderSeen(order.id)}
                                role="presentation"
                            >
                                <div className="flex gap-3">
                                    <input type="checkbox" checked={selected.includes(order.id)} onChange={() => toggleSelect(order.id)} className="mt-1" />
                                    <div className="flex-1">
                                        <div className="flex justify-between gap-2">
                                            <div className={`font-bold ${orderTitleHighlightClass(isHighlighted)}`}>
                                                №{order.id}
                                                {isHighlighted && (
                                                    <span className="ml-2 text-xs font-normal bg-red-500 text-white px-2 py-0.5 rounded-full">
                                                        Новый
                                                    </span>
                                                )}
                                            </div>
                                            <span className={statusBadgeClass(statusColors[order.status])}>{statusLabels[order.status]}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">{order.deliveryInfo?.name || order.user?.name}</div>
                                        <OrderDeliveryBadge summary={getOrderDeliverySummary(order)} />
                                        <div className="font-semibold text-pink-600 mt-2">{order.total.toLocaleString('ru-RU')} ₽</div>
                                        <div className="mt-4">{renderActions(order)}</div>
                                        {openedOrder === order.id && renderOrderDetails(order)}
                                    </div>
                                </div>
                            </div>
                        );})}
                    </div>

                    <div className={`hidden md:block ${cardClass} overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead className="bg-gray-50 text-left text-sm text-gray-600">
                                    <tr>
                                        <th className="px-4 py-3"><input type="checkbox" checked={selected.length === orders.length} onChange={toggleSelectAll} /></th>
                                        <th className="px-4 py-3">№</th>
                                        <th className="px-4 py-3">Клиент</th>
                                        <th className="px-4 py-3">Сумма</th>
                                        <th className="px-4 py-3">Статус</th>
                                        <th className="px-4 py-3">Доставка</th>
                                        <th className="px-4 py-3">Дата</th>
                                        <th className="px-4 py-3">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => {
                                        const isHighlighted = highlightedIds.has(order.id);
                                        return (
                                        <Fragment key={order.id}>
                                            <tr
                                                className={`border-t border-gray-100 ${orderRowHighlightClass(isHighlighted)}`}
                                                onClick={() => markOrderSeen(order.id)}
                                            >
                                                <td className="px-4 py-4"><input type="checkbox" checked={selected.includes(order.id)} onChange={() => toggleSelect(order.id)} /></td>
                                                <td className={`px-4 py-4 font-medium ${isHighlighted ? 'text-red-600' : ''}`}>
                                                    #{order.id}
                                                    {isHighlighted && (
                                                        <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">Новый</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">{order.deliveryInfo?.name || order.user?.name}</td>
                                                <td className="px-4 py-4 font-semibold">{order.total.toLocaleString('ru-RU')} ₽</td>
                                                <td className="px-4 py-4"><span className={statusBadgeClass(statusColors[order.status])}>{statusLabels[order.status]}</span></td>
                                                <td className="px-4 py-4 text-sm text-gray-700">
                                                    {getOrderDeliverySummary(order)?.shortLabel || '—'}
                                                </td>
                                                <td className="px-4 py-4 text-sm">{new Date(order.createdAt).toLocaleDateString('ru-RU')}</td>
                                                <td className="px-4 py-4">{renderActions(order)}</td>
                                            </tr>
                                            {openedOrder === order.id && (
                                                <tr><td colSpan="8" className="px-4 py-6 bg-gray-50">{renderOrderDetails(order)}</td></tr>
                                            )}
                                        </Fragment>
                                    );})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default ShopOrders;
