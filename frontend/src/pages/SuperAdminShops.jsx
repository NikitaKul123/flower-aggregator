import { useContext, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    fetchSuperAdminShops,
    updateSuperAdminShop,
    deleteSuperAdminShop
} from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, inputClass, btnPink, btnSecondary } from '../utils/ui';

const TABS = [
    { id: 'pending', label: 'На проверке' },
    { id: 'verified', label: 'Активные' },
    { id: 'suspended', label: 'Отключённые' },
    { id: 'all', label: 'Все' }
];

export default function SuperAdminShops() {
    const { token } = useContext(AuthContext);
    const [tab, setTab] = useState('pending');
    const [shops, setShops] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const moderation = tab === 'all' ? undefined : tab;
            const data = await fetchSuperAdminShops(token, {
                search: search || undefined,
                moderation
            });
            setShops(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token, tab, search]);

    useEffect(() => {
        load();
    }, [load]);

    const patchShop = async (id, data) => {
        try {
            await updateSuperAdminShop(token, id, data);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    const removeShop = async (id) => {
        if (!window.confirm('Удалить магазин и все связанные данные?')) return;
        try {
            await deleteSuperAdminShop(token, id);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <SuperAdminLayout title="Модерация магазинов">
            <div className="flex flex-wrap gap-2 mb-4">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium ${
                            tab === t.id
                                ? 'bg-violet-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-700'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    className={`${inputClass()} max-w-sm`}
                    placeholder="Поиск…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load()}
                />
                <button type="button" onClick={load} className={`${btnPink} px-4 py-2 text-sm`}>
                    Найти
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : (
                <div className="space-y-4">
                    {shops.map((shop) => (
                        <div key={shop.id} className={`${cardClass} p-4 sm:p-5`}>
                            <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                    <p className="font-bold text-lg">
                                        {shop.name}
                                        {shop.isSuspended && (
                                            <span className="ml-2 text-xs font-normal text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                                                Отключён
                                            </span>
                                        )}
                                        {shop.isVerified && !shop.isSuspended && (
                                            <span className="ml-2 text-xs font-normal text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                                ✓ Проверен
                                            </span>
                                        )}
                                        {!shop.isVerified && !shop.isSuspended && (
                                            <span className="ml-2 text-xs font-normal text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                                                Ожидает проверки
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">📍 {shop.address}</p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Владелец: {shop.owner?.name || '—'} ({shop.owner?.email || 'нет'})
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Товаров: {shop._count?.products ?? 0} · Заказов:{' '}
                                        {shop._count?.orders ?? 0}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 items-start">
                                    {!shop.isVerified && !shop.isSuspended && (
                                        <button
                                            type="button"
                                            onClick={() => patchShop(shop.id, { isVerified: true })}
                                            className={`${btnPink} px-3 py-2 text-sm`}
                                        >
                                            Одобрить
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            patchShop(shop.id, { isSuspended: !shop.isSuspended })
                                        }
                                        className={`${btnSecondary} px-3 py-2 text-sm`}
                                    >
                                        {shop.isSuspended ? 'Включить' : 'Отключить'}
                                    </button>
                                    <Link
                                        to={`/super-admin/shop-chats/${shop.id}`}
                                        className={`${btnSecondary} px-3 py-2 text-sm inline-flex items-center`}
                                    >
                                        💬 Чат
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => removeShop(shop.id)}
                                        className={`${btnSecondary} px-3 py-2 text-sm text-red-600`}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {shops.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Магазины не найдены</p>
                    )}
                </div>
            )}
        </SuperAdminLayout>
    );
}
