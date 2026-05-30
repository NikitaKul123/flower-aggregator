import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createAuthenticatedSocket } from '../utils/socketClient';

import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import PromoToast from '../components/PromoToast';
import { isInChatForOrder, playNotificationSound, dispatchNotificationsUpdated } from '../utils/notifications';
import { fetchUnreadCounts, fetchNotificationSettings } from '../api/notificationsApi';
import {
    canShowBrowserNotifications,
    isBrowserPushEnabledInApp,
    syncBrowserPushPreference,
    showOrderStatusBrowserNotification,
    showChatBrowserNotification
} from '../utils/browserNotify';
import { fetchPublicPromos } from '../api/promosApi';
import { btnPink } from '../utils/ui';
import UserMenu from './UserMenu';
import MobileMenuDrawer from './MobileMenuDrawer';
import { isSuperAdminUser } from '../utils/roles';

const navLinkClass =
    'text-gray-700 hover:text-pink-600 transition text-sm sm:text-base whitespace-nowrap';

const drawerLinkClass = 'mobile-drawer-link';

function Navbar({ mobileCompact = false, drawerOpen = false, onDrawerOpen, onDrawerClose }) {
    const { cart, cartCount } = useContext(CartContext);
    const { user, logout, token } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const locationRef = useRef(location);
    locationRef.current = location;

    const [notifications, setNotifications] = useState(0);
    const [toasts, setToasts] = useState([]);
    const [promoToasts, setPromoToasts] = useState([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const soundEnabledRef = useRef(true);
    const statusNotifyRef = useRef(true);
    const chatNotifyRef = useRef(true);
    const browserPushRef = useRef(true);
    const countsRefreshTimerRef = useRef(null);
    const refreshCountsRef = useRef(null);
    const scheduleRefreshCountsRef = useRef(null);
    const addToastRef = useRef(null);
    const countsInFlightRef = useRef(null);
    const lastCountsFetchAtRef = useRef(0);
    const recentToastKeysRef = useRef(new Set());
    const MIN_COUNTS_FETCH_MS = 2500;

    const addToast = useCallback(({ message, type = 'info', link }) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, link }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const removePromoToast = useCallback((id) => {
        setPromoToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const refreshCounts = useCallback(async (force = false) => {
        if (!token) return null;

        const now = Date.now();
        if (!force && now - lastCountsFetchAtRef.current < MIN_COUNTS_FETCH_MS) {
            return null;
        }
        if (countsInFlightRef.current) {
            return countsInFlightRef.current;
        }

        countsInFlightRef.current = (async () => {
            try {
                const { count } = await fetchUnreadCounts(token);
                lastCountsFetchAtRef.current = Date.now();
                setNotifications(count);
                return { count };
            } catch (e) {
                if (e?.code !== 'ERR_CANCELED' && e?.message !== 'Network Error') {
                    console.error(e);
                }
                return null;
            } finally {
                countsInFlightRef.current = null;
            }
        })();

        return countsInFlightRef.current;
    }, [token]);

    const scheduleRefreshCounts = useCallback(() => {
        if (countsRefreshTimerRef.current) {
            clearTimeout(countsRefreshTimerRef.current);
        }
        countsRefreshTimerRef.current = setTimeout(async () => {
            const counts = await refreshCounts(false);
            if (counts) dispatchNotificationsUpdated(counts);
        }, 800);
    }, [refreshCounts]);

    const notify = useCallback(({ message, type, link, orderId, isShop, chatActor, messageChannel, playSound = true }) => {
        const actor = chatActor || (isShop ? 'shop' : 'customer');
        if (orderId && isInChatForOrder(locationRef.current, orderId, actor, { messageChannel })) {
            scheduleRefreshCounts();
            return;
        }
        addToast({ message, type, link });
        scheduleRefreshCounts();
        if (playSound && soundEnabledRef.current) {
            playNotificationSound();
        }
    }, [addToast, scheduleRefreshCounts]);

    refreshCountsRef.current = refreshCounts;
    scheduleRefreshCountsRef.current = scheduleRefreshCounts;
    addToastRef.current = addToast;

    const applyUnreadCounts = useCallback((counts) => {
        if (!counts || typeof counts.count !== 'number') return;
        const n = Number(counts.count) || 0;
        setNotifications(n);
        dispatchNotificationsUpdated({ count: n });
    }, []);

    useEffect(() => {
        setMenuOpen(false);
        onDrawerClose?.();
    }, [location.pathname, onDrawerClose]);

    useEffect(() => {
        const onCartAdded = (e) => {
            const { message, link } = e.detail || {};
            addToast({
                message: message || 'Товар добавлен в корзину',
                type: 'success',
                link: link || '/cart'
            });
        };
        window.addEventListener('cart-added', onCartAdded);
        return () => window.removeEventListener('cart-added', onCartAdded);
    }, [addToast]);

    useEffect(() => {
        const match = location.pathname.match(/^\/catalog\/(\d+)$/);
        if (!match || user?.role === 'SHOP_ADMIN') {
            return;
        }

        const shopId = Number(match[1]);
        const shopName = sessionStorage.getItem(`shopName_${shopId}`) || 'магазине';

        let cancelled = false;
        fetchPublicPromos(shopId)
            .then(promos => {
                if (cancelled || !promos.length) return;
                setPromoToasts([{ id: `promo-${shopId}`, promos, shopName, shopId }]);
            })
            .catch(err => console.error('Promos toast:', err));

        return () => { cancelled = true; };
    }, [location.pathname, user?.role]);

    useEffect(() => {
        if (!user || !token) {
            setNotifications(0);
            return;
        }

        if (isSuperAdminUser(user)) {
            setNotifications(0);
            return;
        }

        const refreshFromApi = (force = false) => {
            refreshCountsRef.current?.(force).then((c) => {
                if (c) applyUnreadCounts(c);
            });
        };

        refreshFromApi(true);
        const applySettings = (s) => {
            soundEnabledRef.current = s?.soundEnabled !== false;
            statusNotifyRef.current = s?.enableStatus !== false;
            chatNotifyRef.current = s?.enableChat !== false;
            if (s?.enableBrowserPush === false) {
                syncBrowserPushPreference(false);
            } else if (s?.enableBrowserPush === true) {
                syncBrowserPushPreference(true);
            }
            browserPushRef.current = isBrowserPushEnabledInApp();
        };

        fetchNotificationSettings(token).then(applySettings).catch(() => {});

        const onPushChanged = (e) => {
            if (typeof e?.detail?.enabled === 'boolean') {
                syncBrowserPushPreference(e.detail.enabled);
                browserPushRef.current = e.detail.enabled;
                return;
            }
            browserPushRef.current = isBrowserPushEnabledInApp();
        };
        window.addEventListener('browser-push-changed', onPushChanged);

        const onUpdated = (e) => {
            const d = e?.detail;
            if (d && typeof d.count === 'number') {
                setNotifications(d.count);
                return;
            }
            scheduleRefreshCounts();
        };
        const onOrdersUpdated = () => scheduleRefreshCounts();
        window.addEventListener('notifications-updated', onUpdated);
        window.addEventListener('orders-updated', onOrdersUpdated);

        const socket = createAuthenticatedSocket(token);
        const isShop = user.role === 'SHOP_ADMIN';
        const isCourierRole = user.role === 'COURIER';

        const notifySocket = ({
            message,
            type = 'info',
            link,
            orderId,
            isShop: fromShop,
            chatActor,
            messageChannel,
            messageId,
            playSound = true,
            refreshAfter = true
        }) => {
            const dedupeKey = messageId
                ? `msg-${messageId}`
                : `${orderId || ''}-${messageChannel || ''}-${message}`;
            if (recentToastKeysRef.current.has(dedupeKey)) {
                if (refreshAfter) scheduleRefreshCountsRef.current?.();
                return;
            }
            recentToastKeysRef.current.add(dedupeKey);
            setTimeout(() => recentToastKeysRef.current.delete(dedupeKey), 4000);

            const actor = chatActor || (fromShop ? 'shop' : 'customer');
            if (orderId && isInChatForOrder(locationRef.current, orderId, actor, { messageChannel })) {
                if (refreshAfter) scheduleRefreshCountsRef.current?.();
                return;
            }
            addToastRef.current?.({ message, type, link });
            if (refreshAfter) scheduleRefreshCountsRef.current?.();
            if (playSound && soundEnabledRef.current) {
                playNotificationSound();
            }
        };

        let userId = user.id;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId || user.id;
        } catch (e) {
            console.error(e);
        }

        if (isCourierRole) {
            socket.emit('join_courier', userId);

            socket.on('order_assigned', (data) => {
                if (data?.unreadCounts) {
                    applyUnreadCounts(data.unreadCounts);
                } else {
                    scheduleRefreshCountsRef.current?.();
                }
                const shopLabel = user.shopName || 'магазина';
                notifySocket({
                    message: `🛒 Новый заказ №${data.orderId} от ${shopLabel}`,
                    type: 'success',
                    link: data.orderId ? `/courier/orders?highlight=${data.orderId}` : '/courier/orders'
                });
            });

            socket.on('new_message', (msg) => {
                const ch = msg.channel || 'SHOP';
                if (!msg.orderId || !chatNotifyRef.current) return;

                if (ch === 'COURIER' && !msg.isFromCourier) {
                    notifySocket({
                        message: `💬 Сообщение от клиента по заказу №${msg.orderId}`,
                        type: 'info',
                        link: `/courier/orders/${msg.orderId}/chat`,
                        orderId: msg.orderId,
                        chatActor: 'courier',
                        messageChannel: 'COURIER',
                        messageId: msg.id
                    });
                } else if (ch === 'SHOP_COURIER' && msg.isFromShop) {
                    notifySocket({
                        message: `💬 Сообщение от магазина по заказу №${msg.orderId}`,
                        type: 'info',
                        link: `/courier/orders/${msg.orderId}/chat?tab=shop`,
                        orderId: msg.orderId,
                        chatActor: 'courier',
                        messageChannel: 'SHOP_COURIER',
                        messageId: msg.id
                    });
                }
            });

            socket.on('unread_counts', applyUnreadCounts);
            socket.on('notifications_updated', scheduleRefreshCounts);
            socket.on('orders_unread_updated', scheduleRefreshCounts);

            return () => {
                if (countsRefreshTimerRef.current) {
                    clearTimeout(countsRefreshTimerRef.current);
                }
                recentToastKeysRef.current.clear();
                window.removeEventListener('notifications-updated', onUpdated);
                window.removeEventListener('orders-updated', onOrdersUpdated);
                window.removeEventListener('browser-push-changed', onPushChanged);
                socket.off('order_assigned');
                socket.off('new_message');
                socket.off('unread_counts');
                socket.off('notifications_updated');
                socket.off('orders_unread_updated');
                socket.disconnect();
            };
        }

        if (isShop) {
            let shopId = user.shopId;
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                shopId = payload.shopId || user.shopId;
            } catch (e) {
                console.error(e);
            }
            if (shopId) {
                socket.emit('join_shop', shopId);
            }

            socket.on('new_order', (order) => {
                notifySocket({
                    message: `🛒 Новый заказ №${order.id} на сумму ${order.total} ₽`,
                    type: 'success',
                    link: '/shop/orders',
                    isShop: true
                });
            });

            socket.on('platform_message', (msg) => {
                if (!msg?.isFromPlatform || !chatNotifyRef.current) return;
                const onPlatformChat = locationRef.current.pathname === '/shop/platform-chat';
                if (onPlatformChat) return;
                notifySocket({
                    message: msg.text
                        ? `💬 Поддержка: ${msg.text.slice(0, 80)}`
                        : '💬 Новое сообщение от поддержки платформы',
                    type: 'info',
                    link: '/shop/platform-chat',
                    messageId: msg.id,
                    playSound: true
                });
            });

            socket.on('new_message', (msg) => {
                const ch = msg.channel || 'SHOP';
                if (!msg.orderId || !chatNotifyRef.current) return;

                if (ch === 'SHOP' && !msg.isFromShop) {
                    notifySocket({
                        message: `💬 Новое сообщение по заказу №${msg.orderId}`,
                        type: 'info',
                        link: `/shop/orders/${msg.orderId}/chat`,
                        orderId: msg.orderId,
                        isShop: true,
                        messageChannel: 'SHOP',
                        messageId: msg.id
                    });
                    if (
                        browserPushRef.current
                        && canShowBrowserNotifications()
                        && !isInChatForOrder(locationRef.current, msg.orderId, 'shop', { messageChannel: 'SHOP' })
                    ) {
                        showChatBrowserNotification({
                            orderId: msg.orderId,
                            text: msg.text,
                            imageUrl: msg.imageUrl,
                            isShop: true
                        });
                    }
                } else if (ch === 'SHOP_COURIER' && msg.isFromCourier) {
                    notifySocket({
                        message: `💬 Сообщение от курьера по заказу №${msg.orderId}`,
                        type: 'info',
                        link: `/shop/orders/${msg.orderId}/chat?channel=shop-courier`,
                        orderId: msg.orderId,
                        isShop: true,
                        messageChannel: 'SHOP_COURIER',
                        messageId: msg.id
                    });
                }
            });

            socket.on('order_status_updated', ({ orderId, status }) => {
                if (!orderId) return;
                const labels = {
                    DELIVERING: 'В доставке',
                    DELIVERED: 'Доставлен',
                    NO_CONTACT: 'Не дозвонился',
                    READY: 'Готов',
                    CONFIRMED: 'Подтверждён',
                    ASSEMBLING: 'Собирается',
                    PENDING: 'Новый',
                    CANCELLED: 'Отменён'
                };
                const label = labels[status] || status;
                if (statusNotifyRef.current) {
                    notifySocket({
                        message: `📦 Заказ №${orderId} — «${label}» (курьер)`,
                        type: 'info',
                        link: `/shop/orders?highlight=${orderId}`,
                        orderId,
                        isShop: true
                    });
                }
                scheduleRefreshCountsRef.current?.();
            });

            socket.on('unread_counts', applyUnreadCounts);
            socket.on('notifications_updated', scheduleRefreshCounts);
            socket.on('orders_unread_updated', scheduleRefreshCounts);
        } else {
            socket.emit('join_customer', userId);

            socket.on('new_message', (msg) => {
                const ch = msg.channel || 'SHOP';
                if (!msg.orderId || !chatNotifyRef.current) return;

                if (ch === 'SHOP' && msg.isFromShop) {
                    notifySocket({
                        message: `💬 Новое сообщение от магазина по заказу №${msg.orderId}`,
                        type: 'info',
                        link: `/orders/${msg.orderId}/chat`,
                        orderId: msg.orderId,
                        isShop: false,
                        messageChannel: 'SHOP',
                        messageId: msg.id
                    });
                    if (
                        browserPushRef.current
                        && canShowBrowserNotifications()
                        && !isInChatForOrder(locationRef.current, msg.orderId, 'customer', { messageChannel: 'SHOP' })
                    ) {
                        showChatBrowserNotification({
                            orderId: msg.orderId,
                            text: msg.text,
                            imageUrl: msg.imageUrl,
                            isShop: false
                        });
                    }
                } else if (ch === 'COURIER' && msg.isFromCourier) {
                    notifySocket({
                        message: `💬 Сообщение от курьера по заказу №${msg.orderId}`,
                        type: 'info',
                        link: `/orders/${msg.orderId}/chat?channel=courier`,
                        orderId: msg.orderId,
                        isShop: false,
                        messageChannel: 'COURIER',
                        messageId: msg.id
                    });
                    if (
                        browserPushRef.current
                        && canShowBrowserNotifications()
                        && !isInChatForOrder(locationRef.current, msg.orderId, 'customer', { messageChannel: 'COURIER' })
                    ) {
                        showChatBrowserNotification({
                            orderId: msg.orderId,
                            text: msg.text,
                            imageUrl: msg.imageUrl,
                            isShop: false
                        });
                    }
                }
            });

            socket.on('stock_available', (data) => {
                if (!data?.productId) return;
                notifySocket({
                    message: `🌸 «${data.productName || 'Товар'}» снова в наличии`,
                    type: 'success',
                    link: data.link || `/product/${data.productId}`,
                    playSound: true
                });
            });

            socket.on('shop_new_product', (data) => {
                if (!data?.productId) return;
                notifySocket({
                    message: `🆕 ${data.shopName || 'Магазин'}: «${data.productName || 'Новый товар'}»`,
                    type: 'success',
                    link: data.link || `/product/${data.productId}`,
                    playSound: true
                });
            });

            socket.on('status_updated', (data) => {
                if (data?.unreadCounts) {
                    applyUnreadCounts(data.unreadCounts);
                } else {
                    scheduleRefreshCountsRef.current?.();
                }
                if (statusNotifyRef.current) {
                    addToastRef.current?.({
                        message: `📦 Статус заказа №${data.orderId} изменён`,
                        type: 'success',
                        link: `/orders?highlight=${data.orderId}`
                    });
                    if (soundEnabledRef.current) {
                        playNotificationSound();
                    }
                }
                if (
                    statusNotifyRef.current
                    && browserPushRef.current
                    && canShowBrowserNotifications()
                ) {
                    showOrderStatusBrowserNotification({
                        orderId: data.orderId,
                        status: data.status
                    });
                }
            });

            socket.on('unread_counts', applyUnreadCounts);
            socket.on('notifications_updated', scheduleRefreshCounts);
            socket.on('orders_unread_updated', scheduleRefreshCounts);
        }

        return () => {
            if (countsRefreshTimerRef.current) {
                clearTimeout(countsRefreshTimerRef.current);
            }
            countsInFlightRef.current = null;
            recentToastKeysRef.current.clear();
            window.removeEventListener('notifications-updated', onUpdated);
            window.removeEventListener('orders-updated', onOrdersUpdated);
            window.removeEventListener('browser-push-changed', onPushChanged);
            socket.off('new_order');
            socket.off('order_assigned');
            socket.off('platform_message');
            socket.off('new_message');
            socket.off('order_status_updated');
            socket.off('stock_available');
            socket.off('shop_new_product');
            socket.off('status_updated');
            socket.off('unread_counts');
            socket.off('notifications_updated');
            socket.off('orders_unread_updated');
            socket.disconnect();
        };
    }, [user?.id, user?.role, user?.shopId, user?.shopName, token, applyUnreadCounts]);

    const isShop = user?.role === 'SHOP_ADMIN';
    const isCourier = user?.role === 'COURIER';
    const isSuperAdmin = isSuperAdminUser(user);

    const handleLogout = () => {
        logout();
        navigate(isSuperAdmin ? '/super-admin/login' : '/');
        setMenuOpen(false);
    };

    const getDisplayName = () => {
        if (isShop) {
            const n = user?.shopName || user?.name || 'Магазин';
            return n.length > 18 ? n.slice(0, 16) + '…' : n;
        }
        if (isCourier) {
            const n = user?.name || 'Курьер';
            return n.length > 18 ? n.slice(0, 16) + '…' : n;
        }
        if (!user?.name) return 'Пользователь';
        const first = user.name.split(' ')[0];
        return first.length > 15 ? first.slice(0, 12) + '…' : first;
    };

    const profilePath = isSuperAdmin
        ? '/super-admin'
        : isShop
            ? '/shop/profile'
            : isCourier
                ? '/courier/orders'
                : '/profile';
    const avatarSrc = isShop ? user?.shopAvatar : user?.avatar;

    const closeMobile = () => {
        setMenuOpen(false);
        onDrawerClose?.();
    };

    const linkClass = (drawer) => (drawer ? drawerLinkClass : navLinkClass);

    const NavLinks = ({ mobile = false, drawer = false }) => {
        const cls = linkClass(drawer);
        const onNav = () => (mobile || drawer) && closeMobile();

        if (isSuperAdmin) {
            return (
                <>
                    <Link to="/super-admin" className={cls} onClick={onNav}>
                        Обзор
                    </Link>
                    <Link to="/super-admin/users" className={cls} onClick={onNav}>
                        Пользователи
                    </Link>
                    <Link to="/super-admin/shops" className={cls} onClick={onNav}>
                        Магазины
                    </Link>
                    <Link to="/super-admin/shop-chats" className={cls} onClick={onNav}>
                        Чаты магазинов
                    </Link>
                    <Link to="/super-admin/orders" className={cls} onClick={onNav}>
                        Заказы
                    </Link>
                    <Link to="/super-admin/products" className={cls} onClick={onNav}>
                        Товары
                    </Link>
                    <Link to="/super-admin/analytics" className={cls} onClick={onNav}>
                        Аналитика
                    </Link>
                    <Link to="/super-admin/settings" className={cls} onClick={onNav}>
                        Настройки
                    </Link>
                </>
            );
        }

        if (isCourier) {
            return (
                <>
                    <Link to="/courier/orders" className={cls} onClick={onNav}>
                        Мои доставки
                    </Link>
                    <Link
                        to="/courier/notifications"
                        className={`${cls} relative pr-6`}
                        onClick={onNav}
                    >
                        🛎️ Уведомления
                        {notifications > 0 && (
                            <span className="absolute -top-2 right-0 bg-red-500 text-white rounded-full min-w-5 h-5 px-1 text-xs flex items-center justify-center">
                                {notifications}
                            </span>
                        )}
                    </Link>
                    {user?.shopName && (
                        <span className="text-xs text-gray-500 max-w-[140px] truncate hidden md:inline" title={user.shopName}>
                            🏪 {user.shopName}
                        </span>
                    )}
                </>
            );
        }

        return (
        <>
            <Link to="/" className={cls} onClick={onNav}>
                Магазины
            </Link>

            {!isShop && (
                <>
                    <Link to="/wishlist" className={cls} onClick={onNav}>
                        ♡ Избранное
                    </Link>
                </>
            )}

            {!isShop && (
                <Link to="/orders" className={cls} onClick={onNav}>
                    Мои заказы
                </Link>
            )}

            <Link
                to={isShop ? '/shop/notifications' : '/notifications'}
                className={`${cls} relative pr-6`}
                onClick={onNav}
            >
                🛎️ Уведомления
                {notifications > 0 && (
                    <span className="absolute -top-2 right-0 bg-red-500 text-white rounded-full min-w-5 h-5 px-1 text-xs flex items-center justify-center">
                        {notifications}
                    </span>
                )}
            </Link>

            {isShop && (
                <>
                    <Link to="/shop/dashboard" className={cls} onClick={onNav}>
                        Дашборд
                    </Link>
                    <Link to="/shop/products" className={cls} onClick={onNav}>
                        Товары
                    </Link>
                    <Link to="/shop/analytics" className={cls} onClick={onNav}>
                        Аналитика
                    </Link>
                    <Link to="/shop/promos" className={cls} onClick={onNav}>
                        Промокоды
                    </Link>
                    <Link to="/shop/crm" className={cls} onClick={onNav}>
                        CRM
                    </Link>
                    <Link to="/shop/reviews" className={cls} onClick={onNav}>
                        Отзывы
                    </Link>
                    <Link to="/shop/couriers" className={cls} onClick={onNav}>
                        Курьеры
                    </Link>
                    <Link to="/shop/platform-chat" className={cls} onClick={onNav}>
                        Поддержка
                    </Link>
                    <Link to="/shop/profile" className={cls} onClick={onNav}>
                        Профиль магазина
                    </Link>
                    <Link to="/shop/settings/notifications" className={cls} onClick={onNav}>
                        Настройки уведомлений
                    </Link>
                </>
            )}

            {!isShop && (
                <Link to="/profile" className={cls} onClick={onNav}>
                    Профиль
                </Link>
            )}

            {!isShop && (
                <Link to="/cart" className={`${cls} relative pr-5`} onClick={onNav}>
                    🛒 Корзина
                    {cartCount > 0 && (
                        <span className="absolute -top-1 right-0 bg-pink-600 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                            {cartCount}
                        </span>
                    )}
                </Link>
            )}
        </>
        );
    };

    const toastPortal = (promoToasts.length > 0 || toasts.length > 0)
        ? createPortal(
            <>
                {promoToasts.map((toast, index) => (
                    <PromoToast
                        key={toast.id}
                        promos={toast.promos}
                        shopName={toast.shopName}
                        offset={index * 200}
                        onClose={() => removePromoToast(toast.id)}
                    />
                ))}
                {toasts.map((toast, index) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        link={toast.link}
                        offset={(promoToasts.length * 200) + (index * 80)}
                        onClose={() => removeToast(toast.id)}
                        onNavigate={(path) => navigate(path)}
                    />
                ))}
            </>,
            document.body
        )
        : null;

    return (
        <>
            <nav className="bg-white shadow sticky top-0 z-50 shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-4">
                        <Link to="/" className="text-xl sm:text-2xl md:text-3xl font-bold text-pink-600 shrink-0">
                            🌸 FlowerShop
                        </Link>

                        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
                            <NavLinks />
                            {user ? (
                                <div className="ml-2 border-l pl-6 border-gray-200">
                                    <UserMenu
                                        displayName={getDisplayName()}
                                        avatarSrc={avatarSrc}
                                        profilePath={profilePath}
                                        onLogout={handleLogout}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 ml-2">
                                    <Link to="/login" className={navLinkClass}>Войти</Link>
                                    <Link to="/register" className={`${btnPink} px-4 py-2 text-sm`}>
                                        Регистрация
                                    </Link>
                                </div>
                            )}
                        </div>

                        {mobileCompact ? (
                            <button
                                type="button"
                                className="lg:hidden min-h-[48px] min-w-[48px] px-4 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm"
                                onClick={() => (drawerOpen ? onDrawerClose?.() : onDrawerOpen?.())}
                                aria-label="Меню"
                                aria-expanded={drawerOpen}
                            >
                                Ещё
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="lg:hidden min-h-[48px] min-w-[48px] p-2 rounded-xl border border-gray-200 text-gray-700"
                                onClick={() => setMenuOpen(prev => !prev)}
                                aria-label="Меню"
                            >
                                {menuOpen ? '✕' : '☰'}
                            </button>
                        )}
                    </div>

                    {!mobileCompact && menuOpen && (
                        <div className="lg:hidden mt-4 pt-4 border-t border-gray-100 flex flex-col gap-4">
                            <NavLinks mobile />
                            {user ? (
                                <UserMenu
                                    displayName={getDisplayName()}
                                    avatarSrc={avatarSrc}
                                    profilePath={profilePath}
                                    onLogout={handleLogout}
                                />
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <Link to="/login" className={navLinkClass} onClick={closeMobile}>
                                        Войти
                                    </Link>
                                    <Link
                                        to="/register"
                                        className={`${btnPink} text-center px-4 py-3 min-h-[48px]`}
                                        onClick={closeMobile}
                                    >
                                        Регистрация
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            <MobileMenuDrawer
                open={mobileCompact && drawerOpen}
                onClose={() => onDrawerClose?.()}
                title="Меню"
            >
                <NavLinks drawer />
                {user ? (
                    <div className="mt-2 pt-3 border-t border-gray-100 px-1">
                        <UserMenu
                            displayName={getDisplayName()}
                            avatarSrc={avatarSrc}
                            profilePath={profilePath}
                            onLogout={handleLogout}
                        />
                    </div>
                ) : (
                    <div className="mt-2 pt-3 border-t border-gray-100 flex flex-col gap-2 px-1">
                        <Link to="/login" className={drawerLinkClass} onClick={closeMobile}>
                            Войти
                        </Link>
                        <Link to="/register" className={`${btnPink} text-center min-h-[48px] flex items-center justify-center`} onClick={closeMobile}>
                            Регистрация
                        </Link>
                        <Link to="/shop/login" className={drawerLinkClass} onClick={closeMobile}>
                            Вход для магазина
                        </Link>
                        <Link to="/courier/login" className={drawerLinkClass} onClick={closeMobile}>
                            Вход для курьера
                        </Link>
                    </div>
                )}
            </MobileMenuDrawer>

            {toastPortal}
        </>
    );
}

export default Navbar;
