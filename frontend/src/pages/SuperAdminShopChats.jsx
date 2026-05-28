import { useContext, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchSuperAdminPlatformChats } from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, inputClass, btnSecondary } from '../utils/ui';

export default function SuperAdminShopChats() {
    const { token } = useContext(AuthContext);
    const [search, setSearch] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetchSuperAdminPlatformChats(token, {
                search: search || undefined
            });
            setData(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token, search]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <SuperAdminLayout title="Чаты с магазинами">
            <p className="text-sm text-gray-500 mb-4">
                Переписка платформы с партнёрами: модерация, вопросы по работе, предупреждения.
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    className={`${inputClass()} max-w-sm`}
                    placeholder="Поиск магазина…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load()}
                />
                <button type="button" onClick={load} className={`${btnSecondary} px-4 py-2 text-sm`}>
                    Найти
                </button>
                {data?.unreadTotal > 0 && (
                    <span className="text-sm text-violet-700 self-center">
                        Непрочитано: {data.unreadTotal}
                    </span>
                )}
            </div>

            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : (
                <div className={`${cardClass} overflow-x-auto`}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="p-3">Магазин</th>
                                <th className="p-3">Владелец</th>
                                <th className="p-3">Последнее</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {data?.items?.map((row) => (
                                <tr key={row.shopId} className="border-b border-gray-50">
                                    <td className="p-3">
                                        <p className="font-medium">{row.shopName}</p>
                                        {row.isSuspended && (
                                            <span className="text-xs text-red-600">отключён</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                        {row.ownerName || '—'}
                                        <br />
                                        <span className="text-xs">{row.ownerEmail}</span>
                                    </td>
                                    <td className="p-3 max-w-xs">
                                        {row.lastMessage ? (
                                            <>
                                                <p className="truncate">{row.lastMessage}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(row.lastAt).toLocaleString('ru-RU')}
                                                </p>
                                            </>
                                        ) : (
                                            <span className="text-gray-400">Нет сообщений</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {row.unreadCount > 0 && (
                                            <span className="inline-block mr-2 text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full">
                                                {row.unreadCount}
                                            </span>
                                        )}
                                        <Link
                                            to={`/super-admin/shop-chats/${row.shopId}`}
                                            className="text-violet-600 hover:underline"
                                        >
                                            Открыть →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data?.items?.length === 0 && (
                        <p className="p-8 text-center text-gray-400">Магазины не найдены</p>
                    )}
                </div>
            )}
        </SuperAdminLayout>
    );
}
