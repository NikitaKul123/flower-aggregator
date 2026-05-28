import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchSuperAdminCouriers, updateSuperAdminCourier } from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, btnSecondary } from '../utils/ui';

export default function SuperAdminCouriers() {
    const { token } = useContext(AuthContext);
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            setCouriers(await fetchSuperAdminCouriers(token));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = async (userId, isActive) => {
        try {
            await updateSuperAdminCourier(token, userId, isActive);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <SuperAdminLayout title="Курьеры">
            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : (
                <div className={`${cardClass} overflow-x-auto`}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="p-3">Курьер</th>
                                <th className="p-3">Магазин</th>
                                <th className="p-3">Контакты</th>
                                <th className="p-3">Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            {couriers.map((c) => (
                                <tr key={c.id} className="border-b border-gray-50">
                                    <td className="p-3 font-medium">{c.user?.name}</td>
                                    <td className="p-3">{c.shop?.name}</td>
                                    <td className="p-3 text-gray-600">
                                        {c.user?.email}
                                        {c.user?.phone && <br />}
                                        {c.user?.phone}
                                    </td>
                                    <td className="p-3">
                                        <button
                                            type="button"
                                            onClick={() => toggle(c.userId, !c.isActive)}
                                            className={`${btnSecondary} text-xs px-3 py-1.5 ${
                                                c.isActive ? '' : 'text-red-600'
                                            }`}
                                        >
                                            {c.isActive ? 'Активен' : 'Отключён'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {couriers.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Курьеров нет</p>
                    )}
                </div>
            )}
        </SuperAdminLayout>
    );
}
