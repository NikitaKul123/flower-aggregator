import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ShopAuthGate from '../components/ShopAuthGate';
import { fetchShopCustomers, updateShopCustomer } from '../api/shopAdminApi';
import { cardClass, pageTitleClass, btnPink, inputClass } from '../utils/ui';

function ShopCrmContent() {
    const { token } = useContext(AuthContext);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [tagsText, setTagsText] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const load = () => {
        if (!token) return;
        setLoading(true);
        fetchShopCustomers(token)
            .then(setCustomers)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, [token]);

    const selected = customers.find(c => c.id === selectedId);

    useEffect(() => {
        if (selected) {
            setTagsText((selected.tags || []).join(', '));
            setNotes(selected.notes || '');
        }
    }, [selectedId, selected?.tags, selected?.notes]);

    const save = async () => {
        if (!selectedId) return;
        setSaving(true);
        try {
            const tags = tagsText
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);
            await updateShopCustomer(token, selectedId, { tags, notes });
            load();
            alert('Сохранено');
        } catch {
            alert('Ошибка');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className={pageTitleClass}>Клиенты (мини-CRM)</h1>
                <Link to="/shop/dashboard" className="text-pink-600 text-sm hover:underline">← Дашборд</Link>
            </div>

            <p className="text-sm text-gray-600 mb-6">
                Теги и заметки видны только вам. Используйте для повторных продаж («VIP», «День рождения»).
            </p>

            {loading ? (
                <p className="text-center text-gray-500 py-16">Загрузка…</p>
            ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                    <div className={`${cardClass} overflow-hidden`}>
                        <ul className="divide-y max-h-[70vh] overflow-y-auto">
                            {customers.length === 0 ? (
                                <li className="p-8 text-center text-gray-500">Пока нет заказов от клиентов</li>
                            ) : (
                                customers.map(c => (
                                    <li key={c.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(c.id)}
                                            className={`w-full text-left p-4 hover:bg-pink-50/50 ${selectedId === c.id ? 'bg-pink-50' : ''}`}
                                        >
                                            <p className="font-semibold">{c.name}</p>
                                            <p className="text-xs text-gray-500">{c.phone || c.email}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {c.ordersCount} заказ(ов) · {c.totalSpent?.toLocaleString('ru-RU')} ₽
                                            </p>
                                            {(c.tags?.length > 0) && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {c.tags.map(t => (
                                                        <span key={t} className="text-[10px] bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                    <div className={cardClass}>
                        {selected ? (
                            <div className="p-6 space-y-4">
                                <h2 className="text-xl font-bold">{selected.name}</h2>
                                <p className="text-sm text-gray-600">
                                    {selected.phone && <>📞 {selected.phone}<br /></>}
                                    {selected.email}
                                </p>
                                <div>
                                    <label className="text-sm font-medium">Теги (через запятую)</label>
                                    <input
                                        className={`${inputClass()} mt-1`}
                                        value={tagsText}
                                        onChange={e => setTagsText(e.target.value)}
                                        placeholder="VIP, Постоянный, Корпоратив"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Заметки</label>
                                    <textarea
                                        className={`${inputClass()} mt-1 resize-none`}
                                        rows={5}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Предпочитает розы, доставка на работу…"
                                    />
                                </div>
                                <button type="button" disabled={saving} onClick={save} className={`${btnPink} w-full py-3`}>
                                    {saving ? '…' : 'Сохранить'}
                                </button>
                            </div>
                        ) : (
                            <p className="p-12 text-center text-gray-500">Выберите клиента слева</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ShopCrm() {
    return (
        <ShopAuthGate>
            <ShopCrmContent />
        </ShopAuthGate>
    );
}
