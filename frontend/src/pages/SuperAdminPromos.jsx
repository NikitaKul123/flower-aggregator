import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchSuperAdminPromos, updateSuperAdminPromo } from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, btnSecondary } from '../utils/ui';

export default function SuperAdminPromos() {
    const { token } = useContext(AuthContext);
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            setPromos(await fetchSuperAdminPromos(token));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = async (id, isActive) => {
        try {
            await updateSuperAdminPromo(token, id, isActive);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <SuperAdminLayout title="Промокоды">
            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : (
                <div className="space-y-3">
                    {promos.map((p) => (
                        <div
                            key={p.id}
                            className={`${cardClass} p-4 flex flex-wrap justify-between gap-3 items-center`}
                        >
                            <div>
                                <p className="font-bold text-lg">{p.code}</p>
                                <p className="text-sm text-gray-500">{p.shop?.name}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    {p.discountType === 'PERCENT'
                                        ? `${p.discountValue}%`
                                        : `${p.discountValue} ₽`}
                                    {' · '}использовано {p.usedCount}
                                    {p.maxUses != null && ` / ${p.maxUses}`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => toggle(p.id, !p.isActive)}
                                className={`${btnSecondary} px-4 py-2 text-sm ${
                                    !p.isActive ? 'text-red-600' : ''
                                }`}
                            >
                                {p.isActive ? 'Активен' : 'Отключён'}
                            </button>
                        </div>
                    ))}
                    {promos.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Промокодов нет</p>
                    )}
                </div>
            )}
        </SuperAdminLayout>
    );
}
