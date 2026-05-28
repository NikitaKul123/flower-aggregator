import { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    fetchProfile,
    updateProfile,
    uploadAvatar,
    addAddress,
    updateAddress,
    deleteAddress,
    ADDRESS_LABELS
} from '../api/profileApi';
import Avatar from '../components/Avatar';
import { cardClass, pageTitleClass, inputClass, labelClass, btnPink, btnSecondary } from '../utils/ui';

function Profile() {
    const { user, token, login, updateUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '', deliveryNotes: '', contactMethod: 'phone', newsletter: false });
    const [addrForm, setAddrForm] = useState({ label: 'HOME', title: '', address: '', isDefault: false });
    const [showAddrForm, setShowAddrForm] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetchProfile(token)
            .then(data => {
                setProfile(data);
                setForm({
                    name: data.name || '',
                    phone: data.phone || '',
                    deliveryNotes: data.preferences?.deliveryNotes || '',
                    contactMethod: data.preferences?.contactMethod || 'phone',
                    newsletter: !!data.preferences?.newsletter
                });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    if (!user) return <Navigate to="/login" />;
    if (user.role === 'SHOP_ADMIN') return <Navigate to="/shop/dashboard" />;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return <Navigate to="/super-admin" />;
    if (user.role === 'COURIER') return <Navigate to="/courier/orders" />;

    const onAvatarPick = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const updated = await uploadAvatar(token, reader.result);
                setProfile(prev => ({ ...prev, avatar: updated.avatar }));
                updateUser({ avatar: updated.avatar });
                login(token, { ...user, avatar: updated.avatar });
            } catch (err) {
                alert(err.response?.data?.error || 'Ошибка загрузки');
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const saveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await updateProfile(token, {
                name: form.name,
                phone: form.phone,
                preferences: {
                    deliveryNotes: form.deliveryNotes,
                    contactMethod: form.contactMethod,
                    newsletter: form.newsletter
                }
            });
            setProfile(updated);
            login(token, { ...user, name: updated.name, phone: updated.phone });
            alert('Профиль сохранён');
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const submitAddress = async (e) => {
        e.preventDefault();
        try {
            await addAddress(token, addrForm);
            const data = await fetchProfile(token);
            setProfile(data);
            setShowAddrForm(false);
            setAddrForm({ label: 'HOME', title: '', address: '', isDefault: false });
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка');
        }
    };

    const setDefaultAddress = async (id) => {
        await updateAddress(token, id, { isDefault: true });
        const data = await fetchProfile(token);
        setProfile(data);
    };

    const removeAddress = async (id) => {
        if (!window.confirm('Удалить адрес?')) return;
        await deleteAddress(token, id);
        const data = await fetchProfile(token);
        setProfile(data);
    };

    if (loading) return <div className="text-center py-20 text-gray-500">Загрузка…</div>;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <h1 className={`${pageTitleClass} mb-8`}>👤 Профиль</h1>

            <div className={`${cardClass} p-6 mb-6 flex flex-col sm:flex-row items-center gap-6`}>
                <Avatar src={profile?.avatar} name={profile?.name} size="xl" />
                <div>
                    <label className={`${btnSecondary} px-4 py-2 text-sm cursor-pointer inline-block`}>
                        Загрузить фото
                        <input type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG до 5 МБ</p>
                </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-6">
                <div className={`${cardClass} p-5 sm:p-8 space-y-5`}>
                    <h2 className="text-xl font-semibold">Личные данные</h2>
                    <p className="text-sm text-gray-500">{profile?.email}</p>
                    <div>
                        <label className={labelClass}>Имя</label>
                        <input className={inputClass()} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Телефон</label>
                        <input className={inputClass()} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                </div>

                <div className={`${cardClass} p-5 sm:p-8 space-y-5`}>
                    <h2 className="text-xl font-semibold">Предпочтения</h2>
                    <div>
                        <label className={labelClass}>Предпочтительный способ связи</label>
                        <select className={inputClass()} value={form.contactMethod} onChange={e => setForm({ ...form, contactMethod: e.target.value })}>
                            <option value="phone">Телефон</option>
                            <option value="email">Email</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Заметки для курьера</label>
                        <textarea className={`${inputClass()} resize-none`} rows={3} value={form.deliveryNotes} onChange={e => setForm({ ...form, deliveryNotes: e.target.value })} placeholder="Домофон, этаж…" />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.newsletter} onChange={e => setForm({ ...form, newsletter: e.target.checked })} />
                        Получать акции и новости
                    </label>
                </div>

                <button type="submit" disabled={saving} className={`${btnPink} w-full py-4`}>
                    {saving ? 'Сохранение…' : 'Сохранить профиль'}
                </button>
            </form>

            <div className={`${cardClass} p-5 sm:p-8 mt-8`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Адреса доставки</h2>
                    <button type="button" onClick={() => setShowAddrForm(!showAddrForm)} className={`${btnSecondary} px-4 py-2 text-sm`}>
                        {showAddrForm ? 'Отмена' : '+ Адрес'}
                    </button>
                </div>

                {showAddrForm && (
                    <form onSubmit={submitAddress} className="mb-6 p-4 bg-gray-50 rounded-2xl space-y-3">
                        <div className="flex gap-2">
                            {['HOME', 'WORK', 'OTHER'].map(l => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => setAddrForm({ ...addrForm, label: l })}
                                    className={`px-3 py-1.5 rounded-full text-sm border ${addrForm.label === l ? 'bg-pink-600 text-white border-pink-600' : 'bg-white'}`}
                                >
                                    {ADDRESS_LABELS[l]}
                                </button>
                            ))}
                        </div>
                        <input className={inputClass()} placeholder="Название (необязательно)" value={addrForm.title} onChange={e => setAddrForm({ ...addrForm, title: e.target.value })} />
                        <input className={inputClass()} placeholder="Адрес *" required value={addrForm.address} onChange={e => setAddrForm({ ...addrForm, address: e.target.value })} />
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm({ ...addrForm, isDefault: e.target.checked })} />
                            По умолчанию
                        </label>
                        <button type="submit" className={`${btnPink} px-6 py-2 text-sm`}>Добавить</button>
                    </form>
                )}

                <div className="space-y-3">
                    {profile?.addresses?.length === 0 && (
                        <p className="text-gray-500 text-sm">Нет сохранённых адресов</p>
                    )}
                    {profile?.addresses?.map(a => (
                        <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-100 rounded-2xl">
                            <div>
                                <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                                    {ADDRESS_LABELS[a.label] || a.label}
                                </span>
                                {a.isDefault && <span className="ml-2 text-xs text-gray-500">по умолчанию</span>}
                                <p className="mt-2 font-medium">{a.title || ADDRESS_LABELS[a.label]}</p>
                                <p className="text-gray-600 text-sm">{a.address}</p>
                            </div>
                            <div className="flex gap-2">
                                {!a.isDefault && (
                                    <button type="button" onClick={() => setDefaultAddress(a.id)} className="text-sm text-pink-600 hover:underline">
                                        Сделать основным
                                    </button>
                                )}
                                <button type="button" onClick={() => removeAddress(a.id)} className="text-sm text-red-500 hover:underline">
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Profile;
