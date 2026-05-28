import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
    fetchSuperAdminOwnerProfile,
    changeSuperAdminPassword,
    fetchSuperAdminTeam,
    createSuperAdminTeamMember
} from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, inputClass, btnSecondary, btnPink } from '../utils/ui';

export default function SuperAdminSettings() {
    const { token } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [team, setTeam] = useState([]);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newAdmin, setNewAdmin] = useState({ email: '', name: '', password: '' });
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    const load = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [p, t] = await Promise.all([
                fetchSuperAdminOwnerProfile(token),
                fetchSuperAdminTeam(token)
            ]);
            setProfile(p);
            setTeam(t);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [token]);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMsg('');
        try {
            await changeSuperAdminPassword(token, currentPassword, newPassword);
            setMsg('Пароль обновлён');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err) {
            setMsg(err.response?.data?.error || 'Ошибка');
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setMsg('');
        try {
            const res = await createSuperAdminTeamMember(token, {
                email: newAdmin.email,
                name: newAdmin.name,
                password: newAdmin.password || undefined
            });
            let text = `Создан супер-админ ${res.user.email}`;
            if (res.temporaryPassword) {
                text += `. Временный пароль: ${res.temporaryPassword}`;
            }
            setMsg(text);
            setNewAdmin({ email: '', name: '', password: '' });
            load();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <SuperAdminLayout title="Настройки владельца">
            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : (
                <div className="space-y-8 max-w-xl">
                    {msg && (
                        <p className="text-sm px-4 py-3 rounded-xl bg-violet-50 text-violet-900 border border-violet-200">
                            {msg}
                        </p>
                    )}

                    <section className={`${cardClass} p-6`}>
                        <h2 className="font-semibold mb-2">Ваш аккаунт</h2>
                        <p className="text-sm text-gray-600">
                            {profile?.name} · {profile?.email}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Роль: {profile?.role}
                        </p>
                    </section>

                    <section className={`${cardClass} p-6`}>
                        <h2 className="font-semibold mb-4">Сменить пароль</h2>
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                            <input
                                type="password"
                                className={inputClass()}
                                placeholder="Текущий пароль"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                            <input
                                type="password"
                                className={inputClass()}
                                placeholder="Новый пароль (мин. 8 символов)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                            <button type="submit" className={`${btnPink} px-4 py-2 text-sm`}>
                                Сохранить пароль
                            </button>
                        </form>
                    </section>

                    <section className={`${cardClass} p-6`}>
                        <h2 className="font-semibold mb-2">Команда супер-админов</h2>
                        <ul className="text-sm text-gray-600 mb-4 space-y-1">
                            {team.map((a) => (
                                <li key={a.id}>
                                    {a.name} · {a.email}
                                    {a.isBlocked && (
                                        <span className="text-red-600 ml-2">заблокирован</span>
                                    )}
                                </li>
                            ))}
                        </ul>

                        <h3 className="font-medium text-sm mb-3">Добавить второго супер-админа</h3>
                        <form onSubmit={handleCreateAdmin} className="space-y-3">
                            <input
                                className={inputClass()}
                                placeholder="Email"
                                type="email"
                                value={newAdmin.email}
                                onChange={(e) =>
                                    setNewAdmin((s) => ({ ...s, email: e.target.value }))
                                }
                                required
                            />
                            <input
                                className={inputClass()}
                                placeholder="Имя"
                                value={newAdmin.name}
                                onChange={(e) =>
                                    setNewAdmin((s) => ({ ...s, name: e.target.value }))
                                }
                                required
                            />
                            <input
                                className={inputClass()}
                                placeholder="Пароль (пусто — сгенерировать)"
                                type="text"
                                value={newAdmin.password}
                                onChange={(e) =>
                                    setNewAdmin((s) => ({ ...s, password: e.target.value }))
                                }
                            />
                            <button type="submit" className={`${btnSecondary} px-4 py-2 text-sm`}>
                                Создать
                            </button>
                        </form>
                    </section>
                </div>
            )}
        </SuperAdminLayout>
    );
}
