import { useContext, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchSuperAdminChats } from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, inputClass, btnSecondary } from '../utils/ui';

const FILTERS = [
    { value: 'all', label: 'Все чаты' },
    { value: 'disputes', label: 'Требуют внимания' },
    { value: 'shop_no_reply', label: 'Магазин не ответил' },
    { value: 'courier_no_reply', label: 'Курьер не ответил' }
];

export default function SuperAdminChats() {
    const { token } = useContext(AuthContext);
    const [filter, setFilter] = useState('disputes');
    const [search, setSearch] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetchSuperAdminChats(token, {
                filter,
                search: search || undefined
            });
            setData(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token, filter, search]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <SuperAdminLayout title="Чаты поддержки">
            <p className="text-sm text-gray-500 mb-4">
                Только просмотр — для споров «магазин не ответил» / «курьер». Без ответа более 2 часов.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        type="button"
                        onClick={() => setFilter(f.value)}
                        className={`${btnSecondary} px-3 py-1.5 text-sm ${
                            filter === f.value ? 'ring-2 ring-violet-500' : ''
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    className={`${inputClass()} max-w-sm`}
                    placeholder="Заказ №, магазин, email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load()}
                />
                <button type="button" onClick={load} className={`${btnSecondary} px-4 py-2 text-sm`}>
                    Найти
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : (
                <div className={`${cardClass} overflow-x-auto`}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="p-3">Заказ</th>
                                <th className="p-3">Магазин / клиент</th>
                                <th className="p-3">Последнее</th>
                                <th className="p-3">Флаги</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {data?.items?.length ? (
                                data.items.map((row) => (
                                    <tr key={row.orderId} className="border-b border-gray-50">
                                        <td className="p-3 font-medium">№{row.orderId}</td>
                                        <td className="p-3">
                                            <p>{row.shopName}</p>
                                            <p className="text-gray-500 text-xs">
                                                {row.customerName} · {row.customerEmail}
                                            </p>
                                            {row.courierName && (
                                                <p className="text-xs text-gray-500">🚴 {row.courierName}</p>
                                            )}
                                        </td>
                                        <td className="p-3 max-w-xs">
                                            <p className="truncate">{row.lastMessage}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(row.lastAt).toLocaleString('ru-RU')}
                                            </p>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1">
                                                {row.shopNoReply && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                                        Магазин
                                                    </span>
                                                )}
                                                {row.courierNoReply && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-900">
                                                        Курьер
                                                    </span>
                                                )}
                                                {!row.hasDispute && (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <Link
                                                to={`/super-admin/orders/${row.orderId}`}
                                                className="text-violet-600 hover:underline text-sm"
                                            >
                                                Открыть чат →
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        Нет чатов по фильтру
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </SuperAdminLayout>
    );
}
