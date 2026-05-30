import { useState, useEffect, useContext, useCallback, Fragment, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { createAuthenticatedSocket } from '../utils/socketClient';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { cardClass, pageTitleClass, btnPink, btnSecondary, statusBadgeClass } from '../utils/ui';
import {
    loadFilters,
    saveFilters,
    filtersToQuery,
    defaultCustomerFilters,
    CUSTOMER_KEY
} from '../utils/orderFiltersStorage';
import {
    orderCardHighlightClass,
    orderRowHighlightClass,
    orderTitleHighlightClass
} from '../utils/orderHighlight';
import { acknowledgeOrderStatus, fetchReorderItems } from '../api/customerOrdersApi';
import { submitOrderReview } from '../api/reviewsApi';
import { dispatchNotificationsUpdated } from '../utils/notifications';
import OrderReviewForm from '../components/OrderReviewForm';
import OrderDetailsPanel, { OrderDeliveryBadge } from '../components/OrderDetailsPanel';
import CatalogSearchToolbar from '../components/CatalogSearchToolbar';
import { filterFieldClass } from '../components/MobileFilterSheet';
import { getOrderDeliverySummary } from '../utils/orderDeliveryDisplay';
import { ORDER_STATUS_LABELS as statusLabels, ORDER_STATUS_COLORS as statusColors } from '../utils/orderStatuses';

function CustomerOrders() {
    const { token, user } = useContext(AuthContext);
    const { addToCart } = useContext(CartContext);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightHandled = useRef(false);

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openedOrder, setOpenedOrder] = useState(null);
    const [statusHistory, setStatusHistory] = useState([]);
    const [notification, setNotification] = useState(null);
    const [filters, setFilters] = useState(() => loadFilters(CUSTOMER_KEY, defaultCustomerFilters));
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [highlightedIds, setHighlightedIds] = useState(() => new Set());
    const [reorderingId, setReorderingId] = useState(null);

    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const syncHighlightsFromOrders = (list) => {
        setHighlightedIds(
            new Set(list.filter(o => o.unreadStatusUpdate).map(o => o.id))
        );
    };

    const markOrderSeen = async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        const shouldAck = order?.unreadStatusUpdate || highlightedIds.has(orderId);
        if (!shouldAck || !token) return;

        try {
            const data = await acknowledgeOrderStatus(token, orderId);
            setHighlightedIds(prev => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
            setOrders(prev =>
                prev.map(o =>
                    o.id === orderId ? { ...o, unreadStatusUpdate: false } : o
                )
            );
            if (typeof data.count === 'number') {
                dispatchNotificationsUpdated({ count: data.count });
            } else {
                dispatchNotificationsUpdated();
            }
        } catch (e) {
            console.error('ack-status:', e);
        }
    };

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const qs = filtersToQuery(filters);
            const res = await axios.get(
                `${API_BASE}/api/customer/orders${qs ? `?${qs}` : ''}`,
                auth
            );
            const data = res.data;
            setOrders(data);
            syncHighlightsFromOrders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [token, filters]);

    useEffect(() => {
        saveFilters(CUSTOMER_KEY, filters);
    }, [filters]);

    useEffect(() => {
        if (!token) return;
        fetchOrders();
    }, [token, filters, fetchOrders]);

    useEffect(() => {
        const raw = searchParams.get('highlight');
        if (!raw) {
            highlightHandled.current = false;
            return;
        }
        const orderId = Number(raw);
        if (!orderId) return;

        setHighlightedIds(prev => new Set(prev).add(orderId));
        setOpenedOrder(orderId);
    }, [searchParams]);

    useEffect(() => {
        const raw = searchParams.get('highlight');
        if (!raw || !orders.length || highlightHandled.current) return;

        const orderId = Number(raw);
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        highlightHandled.current = true;
        loadHistory(orderId);
        markOrderSeen(orderId);

        setTimeout(() => {
            document.getElementById(`order-${orderId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 150);

        setSearchParams({}, { replace: true });
    }, [orders, searchParams, setSearchParams]);

    useEffect(() => {
        if (!token) return;

        const onOrdersUpdated = () => fetchOrders();
        window.addEventListener('orders-updated', onOrdersUpdated);

        const payload = JSON.parse(atob(token.split('.')[1]));
        const socket = createAuthenticatedSocket(token);
        socket.emit('join_customer', payload.userId);

        socket.on('status_updated', (data) => {
            setHighlightedIds(prev => new Set(prev).add(data.orderId));
            setOrders(prev =>
                prev.map(o =>
                    o.id === data.orderId
                        ? { ...o, status: data.status, unreadStatusUpdate: true }
                        : o
                )
            );
            if (data?.unreadCounts) {
                dispatchNotificationsUpdated(data.unreadCounts);
            } else {
                dispatchNotificationsUpdated();
            }
            setNotification(`🔔 Заказ №${data.orderId}: ${statusLabels[data.status]}`);
            setTimeout(() => setNotification(null), 5000);
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

        return () => {
            window.removeEventListener('orders-updated', onOrdersUpdated);
            socket.off('status_updated');
            socket.off('new_message');
            socket.off('orders_unread_updated');
            socket.disconnect();
        };
    }, [token, fetchOrders]);

    const loadHistory = async (orderId) => {
        try {
            const res = await axios.get(
                `${API_BASE}/api/customer/orders/${orderId}/status-history`,
                auth
            );
            setStatusHistory(res.data);
        } catch {
            setStatusHistory([]);
        }
    };

    const handleReorder = async (orderId, e) => {
        e?.stopPropagation();
        if (!token || reorderingId) return;
        setReorderingId(orderId);
        try {
            const { items, skipped } = await fetchReorderItems(token, orderId);
            if (!items.length) {
                alert(skipped.length
                    ? `Не удалось добавить товары:\n${skipped.join('\n')}`
                    : 'Нет доступных товаров для повторного заказа');
                return;
            }
            items.forEach(item => addToCart(item, item.quantity || 1));
            if (skipped.length) {
                alert(`В корзину: ${items.length} поз.\nНе добавлено: ${skipped.join(', ')}`);
            }
            navigate('/cart');
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Не удалось повторить заказ');
        } finally {
            setReorderingId(null);
        }
    };

    const toggleOnlyUnread = () => {
        setFilters(prev => ({ ...prev, onlyUnread: !prev.onlyUnread }));
    };

    const activeFiltersCount = useMemo(() => {
        let n = 0;
        if (filters.status !== 'ALL') n += 1;
        if (filters.dateFrom) n += 1;
        if (filters.dateTo) n += 1;
        if (filters.minTotal) n += 1;
        if (filters.maxTotal) n += 1;
        if (filters.onlyUnread) n += 1;
        return n;
    }, [filters]);

    const resetOrderFilters = () => {
        setFilters({ ...defaultCustomerFilters });
        setMobileFiltersOpen(false);
    };

    const orderFilterFields = (
        <div className="space-y-4">
            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Статус
                </label>
                <select
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                    className={filterFieldClass}
                >
                    <option value="ALL">Все статусы</option>
                    {Object.keys(statusLabels).map(k => (
                        <option key={k} value={k}>{statusLabels[k]}</option>
                    ))}
                </select>
            </div>
            <label className="flex items-center gap-3 min-h-[48px] px-1 cursor-pointer">
                <input
                    type="checkbox"
                    checked={filters.onlyUnread}
                    onChange={e => setFilters({ ...filters, onlyUnread: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-pink-600"
                />
                <span className="text-sm text-gray-800">Только с непрочитанными</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                        Дата от
                    </label>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                        className={filterFieldClass}
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                        Дата до
                    </label>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                        className={filterFieldClass}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                        Сумма от
                    </label>
                    <input
                        type="number"
                        placeholder="0"
                        value={filters.minTotal}
                        onChange={e => setFilters({ ...filters, minTotal: e.target.value })}
                        className={filterFieldClass}
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                        Сумма до
                    </label>
                    <input
                        type="number"
                        placeholder="∞"
                        value={filters.maxTotal}
                        onChange={e => setFilters({ ...filters, maxTotal: e.target.value })}
                        className={filterFieldClass}
                    />
                </div>
            </div>
        </div>
    );

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

    const handleReviewSubmit = async (orderId, payload) => {
        await submitOrderReview(token, orderId, payload);
        setOrders(prev =>
            prev.map(o =>
                o.id === orderId
                    ? {
                        ...o,
                        canReview: false,
                        review: { ...payload, id: Date.now(), createdAt: new Date().toISOString() }
                    }
                    : o
            )
        );
    };

    const renderOrderDetails = (order) => {
        const summary = getOrderDeliverySummary(order);
        const extraSections = (
            <>
                {order.courier && !order.isPickup && (
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-sm">
                        <p className="font-semibold text-gray-900">🚴 Курьер</p>
                        <p className="mt-1">{order.courier.name}</p>
                        {order.courier.phone && (
                            <a href={`tel:${order.courier.phone}`} className="text-pink-600 hover:underline">
                                {order.courier.phone}
                            </a>
                        )}
                    </div>
                )}
                {(order.canReview || order.review) && user && (
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                            Отзыв о заказе
                        </h3>
                        <OrderReviewForm
                            existingReview={order.review}
                            onSubmit={payload => handleReviewSubmit(order.id, payload)}
                        />
                        {order.review?.shopReply && (
                            <p className="text-sm text-pink-900 bg-pink-50 rounded-xl p-3 mt-3 border border-pink-100">
                                <span className="font-medium">Ответ магазина: </span>
                                {order.review.shopReply}
                            </p>
                        )}
                    </div>
                )}
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

    const renderActions = (order) => (
        <div className="flex flex-wrap gap-2 items-center">
            <Link
                to={`/orders/${order.id}/chat`}
                className={`${btnPink} px-3 py-2 text-sm relative`}
                onClick={(e) => {
                    e.stopPropagation();
                    markOrderSeen(order.id);
                }}
            >
                💬 Чат
                {Number(order.unreadMessageCount) > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                        {order.unreadMessageCount}
                    </span>
                )}
            </Link>
            <button
                type="button"
                onClick={(e) => handleReorder(order.id, e)}
                disabled={reorderingId === order.id}
                className={`${btnSecondary} px-3 py-2 text-sm disabled:opacity-50`}
            >
                {reorderingId === order.id ? '…' : '↻ Повторить заказ'}
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    toggleOpen(order.id);
                }}
                className={`${btnSecondary} px-3 py-2 text-sm`}
            >
                {openedOrder === order.id ? 'Скрыть' : 'Подробнее'}
            </button>
        </div>
    );

    if (loading && !orders.length) {
        return <div className="text-center py-16 text-gray-500">Загрузка...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <h1 className={`${pageTitleClass} mb-6`}>Мои заказы</h1>

            {notification && (
                <div className="mb-6 bg-green-100 text-green-700 p-4 rounded-2xl text-sm">{notification}</div>
            )}

            <CatalogSearchToolbar
                searchTerm={filters.search}
                onSearchChange={(v) => setFilters({ ...filters, search: v })}
                searchPlaceholder="Поиск: № заказа"
                activeFiltersCount={activeFiltersCount}
                mobileFiltersOpen={mobileFiltersOpen}
                onOpenMobileFilters={() => setMobileFiltersOpen(true)}
                onCloseMobileFilters={() => setMobileFiltersOpen(false)}
                filtersOpen={filtersOpen}
                onToggleFilters={() => setFiltersOpen(v => !v)}
                filterFields={orderFilterFields}
                onResetFilters={resetOrderFilters}
                showReset
                applyLabel={`Показать · ${orders.length}`}
                desktopExtra={(
                    <button
                        type="button"
                        onClick={toggleOnlyUnread}
                        className={`${filters.onlyUnread ? btnPink : btnSecondary} px-4 py-2.5 text-sm shrink-0`}
                    >
                        {filters.onlyUnread ? '✓ С обновлениями' : 'С обновлениями'}
                    </button>
                )}
                mobileAccessory={(
                    <button
                        type="button"
                        onClick={toggleOnlyUnread}
                        className={`w-full py-2 rounded-xl text-sm font-semibold transition ${
                            filters.onlyUnread
                                ? 'bg-pink-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                        {filters.onlyUnread ? '✓ Только с обновлениями' : 'С обновлениями'}
                    </button>
                )}
            />

            {orders.length === 0 ? (
                <div className={`${cardClass} p-12 text-center text-gray-500`}>Заказов не найдено</div>
            ) : (
                <>
                    <div className="md:hidden space-y-4">
                        {orders.map(order => {
                            const isHighlighted = highlightedIds.has(order.id);
                            return (
                                <div
                                    key={order.id}
                                    id={`order-${order.id}`}
                                    className={`${cardClass} p-4 sm:p-6 ${orderCardHighlightClass(isHighlighted)}`}
                                    onClick={() => markOrderSeen(order.id)}
                                    role="presentation"
                                >
                                    <div className="flex justify-between gap-2 mb-2">
                                        <div className={`font-bold ${orderTitleHighlightClass(isHighlighted)}`}>
                                            №{order.id}
                                            {isHighlighted && (
                                                <span className="ml-2 text-xs font-normal bg-red-500 text-white px-2 py-0.5 rounded-full">
                                                    Обновление
                                                </span>
                                            )}
                                        </div>
                                        <span className={statusBadgeClass(statusColors[order.status])}>
                                            {statusLabels[order.status]}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                                        {order.shop?.name && ` · ${order.shop.name}`}
                                    </div>
                                    <OrderDeliveryBadge summary={getOrderDeliverySummary(order)} />
                                    <div className="font-semibold text-pink-600 mt-2">
                                        {order.total.toLocaleString('ru-RU')} ₽
                                    </div>
                                    <div className="mt-4">{renderActions(order)}</div>
                                    {openedOrder === order.id && renderOrderDetails(order)}
                                </div>
                            );
                        })}
                    </div>

                    <div className={`hidden md:block ${cardClass} overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px]">
                                <thead className="bg-gray-50 text-left text-sm text-gray-600">
                                    <tr>
                                        <th className="px-4 py-3">№</th>
                                        <th className="px-4 py-3">Магазин</th>
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
                                                    id={`order-${order.id}`}
                                                    className={`border-t border-gray-100 ${orderRowHighlightClass(isHighlighted)}`}
                                                    onClick={() => markOrderSeen(order.id)}
                                                >
                                                    <td className={`px-4 py-4 font-medium ${isHighlighted ? 'text-red-600' : ''}`}>
                                                        #{order.id}
                                                        {isHighlighted && (
                                                            <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                                                                Обновление
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">{order.shop?.name || '—'}</td>
                                                    <td className="px-4 py-4 font-semibold">
                                                        {order.total.toLocaleString('ru-RU')} ₽
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={statusBadgeClass(statusColors[order.status])}>
                                                            {statusLabels[order.status]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-700">
                                                        {getOrderDeliverySummary(order)?.shortLabel || '—'}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm">
                                                        {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                                                    </td>
                                                    <td className="px-4 py-4">{renderActions(order)}</td>
                                                </tr>
                                                {openedOrder === order.id && (
                                                    <tr>
                                                        <td colSpan="7" className="px-4 py-6 bg-gray-50">
                                                            {renderOrderDetails(order)}
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default CustomerOrders;
