import { useContext, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchShopCouriers, createShopCourier, setCourierActive } from '../api/courierApi';
import { cardClass, pageTitleClass, btnPink, btnSecondary, inputClass, labelClass } from '../utils/ui';

function ShopCouriers() {
    const { token, user } = useContext(AuthContext);
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            setCouriers(await fetchShopCouriers(token));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (user?.role === 'SHOP_ADMIN') load();
    }, [user, load]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await createShopCourier(token, form);
            setForm({ name: '', email: '', phone: '', password: '' });
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (userId, isActive) => {
        try {
            await setCourierActive(token, userId, isActive);
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className={pageTitleClass}>Курьеры</h1>
                    {user?.shopName && (
                        <p className="text-sm text-gray-500 mt-1">
                            Привязаны к магазину «{user.shopName}»
                        </p>
                    )}
                </div>
                <Link to="/shop/orders" className="text-pink-600 hover:underline text-sm">
                    ← К заказам
                </Link>
            </div>

            <div className={`${cardClass} p-5 sm:p-6 mb-6`}>
                <h2 className="font-semibold mb-4">Добавить курьера</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Новый курьер сразу получает доступ только к заказам вашего магазина.
                </p>
                <form onSubmit={handleCreate} className="space-y-3">
                    <div>
                        <label className={labelClass}>Имя</label>
                        <input className={inputClass()} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div>
                        <label className={labelClass}>Email (логин)</label>
                        <input type="email" className={inputClass()} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div>
                        <label className={labelClass}>Телефон</label>
                        <input className={inputClass()} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Пароль</label>
                        <input type="password" className={inputClass()} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                    </div>
                    <button type="submit" disabled={saving} className={`${btnPink} px-6 py-2`}>
                        {saving ? '…' : 'Создать'}
                    </button>
                </form>
            </div>

            {loading ? (
                <p className="text-gray-500 text-center py-8">Загрузка…</p>
            ) : (
                <div className="space-y-3">
                    {couriers.map(c => (
                        <div key={c.id} className={`${cardClass} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                            <div>
                                <p className="font-semibold">{c.user.name}</p>
                                <p className="text-sm text-gray-500">{c.user.email}</p>
                                {c.user.phone && <p className="text-sm text-gray-500">{c.user.phone}</p>}
                                <p className="text-xs text-gray-400 mt-1">
                                    Активных доставок: {c.activeDeliveries}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => toggleActive(c.userId, !c.isActive)}
                                className={c.isActive ? btnSecondary + ' px-4 py-2 text-sm' : btnPink + ' px-4 py-2 text-sm'}
                            >
                                {c.isActive ? 'Отключить' : 'Включить'}
                            </button>
                        </div>
                    ))}
                    {!couriers.length && (
                        <p className="text-center text-gray-500 py-8">Курьеров пока нет</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default ShopCouriers;
