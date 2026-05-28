import { useContext, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    fetchSuperAdminUsers,
    updateSuperAdminUser,
    resetSuperAdminUserPassword
} from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, inputClass, btnSecondary, btnPink } from '../utils/ui';

const ROLES = [
    { value: 'CUSTOMER', label: 'Клиент' },
    { value: 'SHOP_ADMIN', label: 'Магазин' },
    { value: 'COURIER', label: 'Курьер' },
    { value: 'SUPER_ADMIN', label: 'Супер-админ' }
];

export default function SuperAdminUsers() {
    const { token, user: me } = useContext(AuthContext);
    const [searchParams] = useSearchParams();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'ALL');
    const [loading, setLoading] = useState(true);
    const [blockReason, setBlockReason] = useState({});

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await fetchSuperAdminUsers(token, {
                search: search || undefined,
                role: roleFilter !== 'ALL' ? roleFilter : undefined
            });
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token, search, roleFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const changeRole = async (id, role) => {
        if (!window.confirm(`Сменить роль на «${role}»?`)) return;
        try {
            await updateSuperAdminUser(token, id, { role });
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    const toggleBlock = async (u) => {
        const next = !u.isBlocked;
        const label = next ? 'заблокировать' : 'разблокировать';
        if (!window.confirm(`${label} ${u.email}?`)) return;
        const reason = next ? blockReason[u.id] || 'Нарушение правил платформы' : undefined;
        try {
            await updateSuperAdminUser(token, u.id, {
                isBlocked: next,
                blockedReason: reason
            });
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    const resetPassword = async (u) => {
        const custom = window.prompt(
            `Новый пароль для ${u.email} (оставьте пустым — сгенерировать автоматически):`
        );
        if (custom === null) return;
        try {
            const res = await resetSuperAdminUserPassword(token, u.id, {
                newPassword: custom.trim() || undefined,
                generate: !custom.trim()
            });
            const pwd = res.temporaryPassword || custom.trim();
            alert(
                pwd
                    ? `Пароль установлен. Передайте пользователю:\n${pwd}`
                    : 'Пароль обновлён'
            );
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <SuperAdminLayout title="Пользователи">
            <p className="text-sm text-gray-500 mb-4">
                Блокировка отключает вход и заказы. Удаление не используется — только блок.
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    className={`${inputClass()} max-w-xs`}
                    placeholder="Поиск email, имя…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load()}
                />
                <select
                    className={inputClass()}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="ALL">Все роли</option>
                    {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
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
                                <th className="p-3">ID</th>
                                <th className="p-3">Имя / Email</th>
                                <th className="p-3">Роль</th>
                                <th className="p-3">Статус</th>
                                <th className="p-3">Заказов</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr
                                    key={u.id}
                                    className={`border-b border-gray-50 ${u.isBlocked ? 'bg-red-50/50' : ''}`}
                                >
                                    <td className="p-3">{u.id}</td>
                                    <td className="p-3">
                                        <p className="font-medium">{u.name}</p>
                                        <p className="text-gray-500">{u.email}</p>
                                    </td>
                                    <td className="p-3">
                                        <select
                                            className="text-sm border rounded-lg px-2 py-1"
                                            value={u.role}
                                            disabled={u.id === me?.id || u.isBlocked}
                                            onChange={(e) => changeRole(u.id, e.target.value)}
                                        >
                                            {ROLES.map((r) => (
                                                <option key={r.value} value={r.value}>
                                                    {r.label}
                                                </option>
                                            ))}
                                            {u.role === 'ADMIN' && (
                                                <option value="ADMIN">ADMIN (legacy)</option>
                                            )}
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        {u.isBlocked ? (
                                            <span className="text-red-600 font-medium">Заблокирован</span>
                                        ) : (
                                            <span className="text-green-600">Активен</span>
                                        )}
                                        {u.blockedReason && (
                                            <p className="text-xs text-gray-500 mt-0.5">{u.blockedReason}</p>
                                        )}
                                    </td>
                                    <td className="p-3">{u._count?.orders ?? 0}</td>
                                    <td className="p-3">
                                        {u.id !== me?.id && (
                                            <div className="flex flex-col gap-1 items-end">
                                                {!u.isBlocked && (
                                                    <input
                                                        className="text-xs border rounded px-2 py-1 w-36"
                                                        placeholder="Причина блокировки"
                                                        value={blockReason[u.id] || ''}
                                                        onChange={(e) =>
                                                            setBlockReason((s) => ({
                                                                ...s,
                                                                [u.id]: e.target.value
                                                            }))
                                                        }
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleBlock(u)}
                                                    className={`${btnSecondary} text-xs px-2 py-1 ${
                                                        u.isBlocked ? 'text-green-700' : 'text-red-600'
                                                    }`}
                                                >
                                                    {u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => resetPassword(u)}
                                                    className={`${btnSecondary} text-xs px-2 py-1`}
                                                >
                                                    Сброс пароля
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SuperAdminLayout>
    );
}
