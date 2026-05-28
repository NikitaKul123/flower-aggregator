import { useContext, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchSuperAdminOrders, updateSuperAdminOrderStatus } from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, inputClass, btnPink } from '../utils/ui';
import { ORDER_STATUS_LABELS } from '../utils/orderStatuses';

const STATUSES = Object.keys(ORDER_STATUS_LABELS);

export default function SuperAdminOrders() {
    const { token } = useContext(AuthContext);
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await fetchSuperAdminOrders(token, {
                search: search || undefined,
                status: statusFilter !== 'ALL' ? statusFilter : undefined
            });
            setOrders(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token, search, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const changeStatus = async (orderId, status) => {
        if (!window.confirm(`Сменить статус на «${ORDER_STATUS_LABELS[status]}»?`)) return;
        try {
            await updateSuperAdminOrderStatus(token, orderId, status);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <SuperAdminLayout title="Все заказы">
            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    className={`${inputClass()} max-w-xs`}
                    placeholder="№ заказа, клиент, магазин…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load()}
                />
                <select
                    className={inputClass()}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">Все статусы</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                    ))}
                </select>
                <button type="button" onClick={load} className={`${btnPink} px-4 py-2 text-sm`}>
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
                                <th className="p-3">№</th>
                                <th className="p-3">Магазин</th>
                                <th className="p-3">Клиент</th>
                                <th className="p-3">Сумма</th>
                                <th className="p-3">Статус</th>
                                <th className="p-3">Дата</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id} className="border-b border-gray-50">
                                    <td className="p-3 font-medium">
                                        <Link
                                            to={`/super-admin/orders/${o.id}`}
                                            className="text-violet-600 hover:underline"
                                        >
                                            #{o.id}
                                        </Link>
                                    </td>
                                    <td className="p-3">{o.shop?.name}</td>
                                    <td className="p-3">
                                        <p>{o.user?.name}</p>
                                        <p className="text-gray-500 text-xs">{o.user?.email}</p>
                                    </td>
                                    <td className="p-3">{Number(o.total).toLocaleString('ru-RU')} ₽</td>
                                    <td className="p-3">
                                        <select
                                            className="text-sm border rounded-lg px-2 py-1 max-w-[160px]"
                                            value={o.status}
                                            onChange={(e) => changeStatus(o.id, e.target.value)}
                                        >
                                            {STATUSES.map((s) => (
                                                <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-3 text-gray-500">
                                        {new Date(o.createdAt).toLocaleString('ru-RU')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {orders.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Заказы не найдены</p>
                    )}
                </div>
            )}
        </SuperAdminLayout>
    );
}
