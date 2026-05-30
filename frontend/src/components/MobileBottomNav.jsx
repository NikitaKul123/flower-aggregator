import { useContext, useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { fetchUnreadCounts } from '../api/notificationsApi';
import { getMobileNavMode, isActiveNavPath, shouldShowMobileBottomNav } from '../utils/mobileNav';

const TAB_CLASS =
    'mobile-bottom-nav__tab flex flex-col items-center justify-center gap-0.5 min-h-[48px] min-w-[48px] flex-1 px-1 py-2 text-[10px] sm:text-xs font-medium transition-colors';

function NavTab({ to, label, icon, badge, active, onClick }) {
    const inner = (
        <>
            <span className="relative text-xl leading-none" aria-hidden>
                {icon}
                {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </span>
            <span className="truncate max-w-full">{label}</span>
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`${TAB_CLASS} ${active ? 'text-pink-600' : 'text-gray-500'}`}
            >
                {inner}
            </button>
        );
    }

    return (
        <Link
            to={to}
            className={`${TAB_CLASS} ${active ? 'text-pink-600' : 'text-gray-500'}`}
            aria-current={active ? 'page' : undefined}
        >
            {inner}
        </Link>
    );
}

function MobileBottomNav({ onOpenMore }) {
    const { pathname } = useLocation();
    const { user, token } = useContext(AuthContext);
    const { cartCount } = useContext(CartContext);
    const [unread, setUnread] = useState(0);

    const mode = getMobileNavMode(user);
    const visible = shouldShowMobileBottomNav(pathname, user) && mode !== 'none';

    const refreshUnread = useCallback(async () => {
        if (!token || mode === 'guest' || mode === 'none') {
            setUnread(0);
            return;
        }
        try {
            const { count } = await fetchUnreadCounts(token);
            setUnread(Number(count) || 0);
        } catch {
            /* ignore */
        }
    }, [token, mode]);

    useEffect(() => {
        refreshUnread();
    }, [refreshUnread, pathname]);

    useEffect(() => {
        const onUpdated = (e) => {
            const c = e?.detail?.count;
            if (typeof c === 'number') setUnread(c);
            else refreshUnread();
        };
        window.addEventListener('notifications-updated', onUpdated);
        return () => window.removeEventListener('notifications-updated', onUpdated);
    }, [refreshUnread]);

    if (!visible) return null;

    const active = (to) => isActiveNavPath(pathname, to);

    const moreActive =
        mode === 'shop'
            && ['/shop/analytics', '/shop/promos', '/shop/crm', '/shop/reviews', '/shop/couriers', '/shop/platform-chat', '/shop/profile', '/shop/settings'].some(
                (p) => pathname.startsWith(p)
            );

    if (mode === 'guest') {
        return (
            <nav className="mobile-bottom-nav lg:hidden" aria-label="Основная навигация">
                <NavTab to="/" label="Главная" icon="🏠" active={active('/')} />
                <NavTab to="/wishlist" label="Избранное" icon="♡" active={active('/wishlist')} />
                <NavTab to="/cart" label="Корзина" icon="🛒" badge={cartCount} active={active('/cart')} />
                <NavTab to="/login" label="Войти" icon="👤" active={active('/login')} />
                <NavTab
                    label="Ещё"
                    icon="☰"
                    active={moreActive || pathname === '/register'}
                    onClick={onOpenMore}
                />
            </nav>
        );
    }

    if (mode === 'customer') {
        return (
            <nav className="mobile-bottom-nav lg:hidden" aria-label="Основная навигация">
                <NavTab to="/" label="Главная" icon="🏠" active={active('/')} />
                <NavTab to="/orders" label="Заказы" icon="📦" active={active('/orders')} />
                <NavTab
                    to="/notifications"
                    label="Уведомл."
                    icon="🔔"
                    badge={unread}
                    active={active('/notifications') || active('/settings')}
                />
                <NavTab to="/cart" label="Корзина" icon="🛒" badge={cartCount} active={active('/cart')} />
                <NavTab to="/profile" label="Профиль" icon="👤" active={active('/profile')} />
            </nav>
        );
    }

    if (mode === 'shop') {
        return (
            <nav className="mobile-bottom-nav lg:hidden" aria-label="Навигация магазина">
                <NavTab to="/shop/orders" label="Заказы" icon="📦" active={active('/shop/orders')} />
                <NavTab to="/shop/products" label="Товары" icon="🌸" active={active('/shop/products')} />
                <NavTab
                    to="/shop/notifications"
                    label="Уведомл."
                    icon="🔔"
                    badge={unread}
                    active={active('/shop/notifications') || pathname.includes('/shop/settings')}
                />
                <NavTab to="/shop/dashboard" label="Дашборд" icon="📊" active={active('/shop/dashboard')} />
                <NavTab label="Ещё" icon="☰" active={moreActive} onClick={onOpenMore} />
            </nav>
        );
    }

    if (mode === 'courier') {
        return (
            <nav className="mobile-bottom-nav lg:hidden" aria-label="Навигация курьера">
                <NavTab to="/courier/orders" label="Доставки" icon="🚴" active={active('/courier/orders')} />
                <NavTab
                    to="/courier/notifications"
                    label="Уведомл."
                    icon="🔔"
                    badge={unread}
                    active={active('/courier/notifications')}
                />
                <NavTab label="Ещё" icon="☰" onClick={onOpenMore} />
            </nav>
        );
    }

    return null;
}

export default MobileBottomNav;
