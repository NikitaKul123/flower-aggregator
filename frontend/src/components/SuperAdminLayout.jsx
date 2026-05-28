import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { pageTitleClass, btnSecondary } from '../utils/ui';

const NAV = [
    { to: '/super-admin', label: 'Обзор', end: true },
    { to: '/super-admin/analytics', label: 'Аналитика' },
    { to: '/super-admin/chats', label: 'Чаты' },
    { to: '/super-admin/shops', label: 'Магазины' },
    { to: '/super-admin/shop-chats', label: 'Связь с магазинами' },
    { to: '/super-admin/orders', label: 'Заказы' },
    { to: '/super-admin/reviews', label: 'Отзывы' },
    { to: '/super-admin/couriers', label: 'Курьеры' },
    { to: '/super-admin/promos', label: 'Промо' },
    { to: '/super-admin/users', label: 'Пользователи' },
    { to: '/super-admin/products', label: 'Товары' },
    { to: '/super-admin/audit', label: 'Журнал' },
    { to: '/super-admin/settings', label: 'Настройки' }
];

export default function SuperAdminLayout({ title, children }) {
    const { pathname } = useLocation();
    const { user, logout } = useContext(AuthContext);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                        Супер-админ
                    </p>
                    <h1 className={pageTitleClass}>{title}</h1>
                    {user?.email && (
                        <p className="text-sm text-gray-500 mt-1">{user.name} · {user.email}</p>
                    )}
                </div>
                <button type="button" onClick={logout} className={`${btnSecondary} px-4 py-2 text-sm`}>
                    Выйти
                </button>
            </div>

            <nav className="flex flex-wrap gap-2 mb-8">
                {NAV.map((item) => {
                    const active = item.end
                        ? pathname === item.to
                        : pathname.startsWith(item.to);
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                                active
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-violet-300'
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {children}
        </div>
    );
}
