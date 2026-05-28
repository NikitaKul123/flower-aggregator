import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ShopAuthGate from '../components/ShopAuthGate';
import { fetchShopProfile, updateShopProfile, uploadShopAvatar } from '../api/shopProfileApi';
import Avatar from '../components/Avatar';
import { cardClass, pageTitleClass, inputClass, labelClass, btnPink } from '../utils/ui';

function ShopProfile() {
    const { user, token, login, updateUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [shop, setShop] = useState(null);
    const [form, setForm] = useState({
        name: '',
        address: '',
        phone: '',
        deliveryTime: '',
        sameDayDelivery: true,
        serviceDistrictsText: '',
        maxDeliveryDays: 7,
        autoHideZeroStock: false
    });

    useEffect(() => {
        if (!token) return;
        fetchShopProfile(token)
            .then(data => {
                setShop(data);
                setForm({
                    name: data.name || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    deliveryTime: data.deliveryTime || '',
                    sameDayDelivery: data.sameDayDelivery !== false,
                    serviceDistrictsText: (data.serviceDistricts || []).join(', '),
                    maxDeliveryDays: data.maxDeliveryDays || 7,
                    autoHideZeroStock: !!data.autoHideZeroStock
                });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    const onAvatarPick = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const updated = await uploadShopAvatar(token, reader.result);
                setShop(updated);
                updateUser({ shopAvatar: updated.avatar, shopName: updated.name });
                login(token, { ...user, shopAvatar: updated.avatar, shopName: updated.name });
            } catch (err) {
                alert(err.response?.data?.error || 'Ошибка загрузки');
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await updateShopProfile(token, {
                name: form.name,
                address: form.address,
                phone: form.phone,
                deliveryTime: form.deliveryTime,
                sameDayDelivery: form.sameDayDelivery,
                serviceDistricts: form.serviceDistrictsText
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean),
                maxDeliveryDays: Number(form.maxDeliveryDays) || 7,
                autoHideZeroStock: form.autoHideZeroStock
            });
            setShop(updated);
            updateUser({ shopName: updated.name, shopAvatar: updated.avatar });
            login(token, { ...user, shopName: updated.name, shopAvatar: updated.avatar });
            alert('Сохранено');
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ShopAuthGate>
        {loading ? (
            <div className="text-center py-20 text-gray-500">Загрузка…</div>
        ) : (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className={pageTitleClass}>🏪 Профиль магазина</h1>
                <Link to="/shop/dashboard" className="text-pink-600 hover:underline text-sm">← Дашборд</Link>
            </div>

            <div className={`${cardClass} p-6 mb-6 flex flex-col sm:flex-row items-center gap-6`}>
                <Avatar src={shop?.avatar} name={shop?.name} size="xl" />
                <div>
                    <label className="bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm rounded-xl cursor-pointer inline-block">
                        Загрузить логотип
                        <input type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Отображается в чате и в списке магазинов</p>
                </div>
            </div>

            <form onSubmit={save} className={`${cardClass} p-5 sm:p-8 space-y-5`}>
                <div>
                    <label className={labelClass}>Название</label>
                    <input className={inputClass()} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                    <label className={labelClass}>Адрес</label>
                    <input className={inputClass()} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
                </div>
                <div>
                    <label className={labelClass}>Телефон</label>
                    <input className={inputClass()} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                    <label className={labelClass}>Время доставки (подпись)</label>
                    <input className={inputClass()} value={form.deliveryTime} onChange={e => setForm({ ...form, deliveryTime: e.target.value })} placeholder="60–90 мин" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.sameDayDelivery}
                        onChange={e => setForm({ ...form, sameDayDelivery: e.target.checked })}
                    />
                    <span className="text-sm">Доставка в день заказа</span>
                </label>
                <div>
                    <label className={labelClass}>Районы доставки</label>
                    <input
                        className={inputClass()}
                        value={form.serviceDistrictsText}
                        onChange={e => setForm({ ...form, serviceDistrictsText: e.target.value })}
                        placeholder="Центр, Север, Восток — через запятую"
                    />
                    <p className="text-xs text-gray-500 mt-1">Используются в фильтре на главной</p>
                </div>
                <div>
                    <label className={labelClass}>Заказ на дней вперёд (макс.)</label>
                    <input
                        type="number"
                        min={1}
                        max={14}
                        className={inputClass()}
                        value={form.maxDeliveryDays}
                        onChange={e => setForm({ ...form, maxDeliveryDays: e.target.value })}
                    />
                </div>
                <label className="flex items-start gap-2 cursor-pointer col-span-2 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                    <input
                        type="checkbox"
                        checked={form.autoHideZeroStock}
                        onChange={e => setForm({ ...form, autoHideZeroStock: e.target.checked })}
                        className="mt-1"
                    />
                    <span className="text-sm">
                        <span className="font-medium">Отключать продажу при нулевом остатке</span>
                        <span className="block text-gray-600 mt-1">
                            Укажите остаток числом у товара. Когда он станет 0 — карточка останется в каталоге, но будет «нет в наличии» (как отключённая). Придёт уведомление «Пополните склад».
                        </span>
                    </span>
                </label>
                {shop?.owner && (
                    <p className="text-sm text-gray-500 pt-2 border-t">
                        Владелец: {shop.owner.name} · {shop.owner.email}
                    </p>
                )}
                <button type="submit" disabled={saving} className={`${btnPink} w-full py-4`}>
                    {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
            </form>
        </div>
        )}
        </ShopAuthGate>
    );
}

export default ShopProfile;
