import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchSuperAdminDashboard } from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, statusBadgeClass } from '../utils/ui';
import { ORDER_STATUS_LABELS } from '../utils/orderStatuses';

export default function SuperAdminDashboard() {
    const { token } = useContext(AuthContext);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetchSuperAdminDashboard(token)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <SuperAdminLayout title="Обзор платформы">
            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : data ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                        {[
                            { label: 'Пользователи', value: data.usersCount, to: '/super-admin/users' },
                            {
                                label: 'На проверке',
                                value: data.pendingShopsCount ?? 0,
                                to: '/super-admin/shops'
                            },
                            { label: 'Магазины', value: data.shopsCount, to: '/super-admin/shops' },
                            { label: 'Заказы', value: data.ordersCount, to: '/super-admin/orders' },
                            { label: 'Товары', value: data.productsCount, to: '/super-admin/products' },
                            { label: 'Курьеры', value: data.couriersCount, to: '/super-admin/users?role=COURIER' },
                            {
                                label: 'Оборот',
                                value: `${Number(data.revenueTotal).toLocaleString('ru-RU')} ₽`,
                                to: '/super-admin/analytics'
                            }
                        ].map((item) => (
                            <Link
                                key={item.label}
                                to={item.to}
                                className={`${cardClass} p-4 hover:ring-2 hover:ring-violet-200 transition`}
                            >
                                <p className="text-xs text-gray-500">{item.label}</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">{item.value}</p>
                            </Link>
                        ))}
                    </div>

                    {data.ordersByStatus?.length > 0 && (
                        <div className={`${cardClass} p-5 mb-8`}>
                            <h2 className="font-semibold mb-3">Заказы по статусам</h2>
                            <div className="flex flex-wrap gap-2">
                                {data.ordersByStatus.map((row) => (
                                    <span
                                        key={row.status}
                                        className={statusBadgeClass('bg-violet-50 text-violet-800 border border-violet-100')}
                                    >
                                        {row.label}: {row.count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={`${cardClass} p-5`}>
                        <h2 className="font-semibold mb-4">Последние заказы</h2>
                        <ul className="space-y-3">
                            {data.recentOrders?.map((o) => (
                                <li
                                    key={o.id}
                                    className="flex flex-wrap justify-between gap-2 text-sm border-b border-gray-100 pb-3 last:border-0"
                                >
                                    <span>
                                        №{o.id} · {o.shop?.name} · {o.user?.name || o.user?.email}
                                    </span>
                                    <span className="text-gray-500">
                                        {ORDER_STATUS_LABELS[o.status] || o.status} ·{' '}
                                        {Number(o.total).toLocaleString('ru-RU')} ₽
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            ) : (
                <p className="text-red-600">Не удалось загрузить данные</p>
            )}
        </SuperAdminLayout>
    );
}
