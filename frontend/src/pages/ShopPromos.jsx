import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ShopAuthGate from '../components/ShopAuthGate';
import ShopPromoBanner from '../components/ShopPromoBanner';
import { fetchPromos, createPromo, updatePromo, deletePromo } from '../api/shopAdminApi';
import { cardClass, pageTitleClass, inputClass, labelClass, btnPink, btnSecondary } from '../utils/ui';

const emptyForm = {
    code: '',
    description: '',
    discountType: 'PERCENT',
    discountValue: 10,
    minOrder: 0,
    maxUses: '',
    validFrom: '',
    validTo: '',
    isActive: true,
    notifySubscribers: true
};

function ShopPromos() {
    const { token, user } = useContext(AuthContext);
    const [list, setList] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = () => {
        fetchPromos(token).then(setList).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (token) load();
    }, [token]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            await createPromo(token, {
                ...form,
                maxUses: form.maxUses ? Number(form.maxUses) : null,
                validFrom: form.validFrom || null,
                validTo: form.validTo || null,
                notifySubscribers: form.notifySubscribers
            });
            setForm(emptyForm);
            setShowForm(false);
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка');
        }
    };

    const toggleActive = async (p) => {
        await updatePromo(token, p.id, { isActive: !p.isActive });
        load();
    };

    const remove = async (id) => {
        if (!window.confirm('Удалить промокод?')) return;
        await deletePromo(token, id);
        load();
    };

    return (
        <ShopAuthGate>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
                <h1 className={pageTitleClass}>🏷️ Промокоды</h1>
                <div className="flex gap-3">
                    <button type="button" onClick={() => setShowForm(!showForm)} className={`${btnPink} px-4 py-2 text-sm`}>
                        {showForm ? 'Отмена' : '+ Создать'}
                    </button>
                    <Link to="/shop/dashboard" className="text-pink-600 hover:underline text-sm self-center">← Дашборд</Link>
                </div>
            </div>

            {user?.shopId && (
                <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-sm text-gray-500 mb-4">Так промокоды видят покупатели:</p>
                    <ShopPromoBanner shopId={user.shopId} />
                </div>
            )}

            {showForm && (
                <form onSubmit={submit} className={`${cardClass} p-6 mb-8 space-y-4`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Код *</label>
                            <input className={inputClass()} value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
                        </div>
                        <div>
                            <label className={labelClass}>Тип скидки</label>
                            <select className={inputClass()} value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}>
                                <option value="PERCENT">Процент</option>
                                <option value="FIXED">Фиксированная (₽)</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Значение</label>
                            <input type="number" className={inputClass()} value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelClass}>Мин. сумма заказа</label>
                            <input type="number" className={inputClass()} value={form.minOrder} onChange={e => setForm({ ...form, minOrder: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelClass}>Лимит использований</label>
                            <input type="number" className={inputClass()} placeholder="Без лимита" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelClass}>Описание</label>
                            <input className={inputClass()} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.notifySubscribers}
                            onChange={e => setForm({ ...form, notifySubscribers: e.target.checked })}
                        />
                        Уведомить подписчиков магазина об акции
                    </label>
                    <button type="submit" className={`${btnPink} px-8 py-3`}>Создать</button>
                </form>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-500">Загрузка…</div>
            ) : list.length === 0 ? (
                <div className={`${cardClass} p-12 text-center text-gray-500`}>Промокодов пока нет</div>
            ) : (
                <div className="space-y-3">
                    {list.map(p => (
                        <div key={p.id} className={`${cardClass} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                            <div>
                                <span className="font-mono font-bold text-lg text-pink-600">{p.code}</span>
                                <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                    {p.isActive ? 'Активен' : 'Выкл'}
                                </span>
                                <p className="text-sm text-gray-600 mt-2">
                                    {p.discountType === 'PERCENT' ? `${p.discountValue}%` : `${p.discountValue} ₽`} · использовано {p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ''}
                                </p>
                                {p.description && <p className="text-sm text-gray-400">{p.description}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => toggleActive(p)} className={`${btnSecondary} px-3 py-1.5 text-sm`}>
                                    {p.isActive ? 'Выключить' : 'Включить'}
                                </button>
                                <button type="button" onClick={() => remove(p.id)} className="text-red-500 text-sm hover:underline px-2">
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        </ShopAuthGate>
    );
}

export default ShopPromos;
