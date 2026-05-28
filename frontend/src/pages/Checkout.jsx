import { useContext, useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import axios from 'axios';

import { CartContext } from '../context/CartContext';

import { AuthContext } from '../context/AuthContext';

import { fetchProfile, ADDRESS_LABELS } from '../api/profileApi';

import { validatePromoCode } from '../api/shopAdminApi';
import { fetchShopById } from '../api/catalogApi';
import { inputClass, labelClass, cardClass, pageTitleClass, btnPrimary, btnSecondary } from '../utils/ui';
import { buildDeliveryDateOptions, DEFAULT_DELIVERY_SLOTS } from '../utils/deliveryOptions';
import { API_BASE } from '../config/api';



function Checkout() {

    const { cart, total, clearCart } = useContext(CartContext);

    const { user, token } = useContext(AuthContext);

    const navigate = useNavigate();



    const [formData, setFormData] = useState({

        name: '',

        phone: '',

        address: '',

        comment: '',

        giftCardMessage: ''

    });

    const [addresses, setAddresses] = useState([]);

    const [selectedAddressId, setSelectedAddressId] = useState('');

    const [promoInput, setPromoInput] = useState('');

    const [promoApplied, setPromoApplied] = useState(null);

    const [errors, setErrors] = useState({});

    const [loading, setLoading] = useState(false);
    const [isPickup, setIsPickup] = useState(false);
    const [shopInfo, setShopInfo] = useState(null);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliverySlotId, setDeliverySlotId] = useState('');



    const shopId = cart[0]?.shopId ?? cart[0]?.shop?.id;

    const subtotal = total;

    const discount = promoApplied?.discount || 0;

    const finalTotal = promoApplied?.total ?? subtotal;



    useEffect(() => {

        if (!user) return;

        setFormData(prev => ({

            ...prev,

            name: user.name || prev.name,

            phone: user.phone || prev.phone

        }));

        if (token) {

            fetchProfile(token)

                .then(profile => {

                    setAddresses(profile.addresses || []);

                    const def = profile.addresses?.find(a => a.isDefault) || profile.addresses?.[0];

                    if (def) setSelectedAddressId(String(def.id));

                    setFormData(prev => ({
                        ...prev,
                        ...(def && { address: def.address }),
                        ...(profile.preferences?.deliveryNotes && !prev.comment
                            ? { comment: profile.preferences.deliveryNotes }
                            : {})
                    }));

                })

                .catch(() => {});

        }

    }, [user, token]);

    useEffect(() => {
        if (!shopId) return;
        fetchShopById(shopId)
            .then(shop => {
                setShopInfo(shop);
                const dates = buildDeliveryDateOptions(shop.maxDeliveryDays || 7);
                const first = dates.find(d => !d.isToday || shop.sameDayDelivery !== false) || dates[0];
                if (first) setDeliveryDate(first.value);
                const slots = shop.deliverySlotOptions?.length
                    ? shop.deliverySlotOptions
                    : DEFAULT_DELIVERY_SLOTS;
                if (slots[0]) setDeliverySlotId(slots[0].id);
            })
            .catch(() => {});
    }, [shopId]);

    const dateOptions = shopInfo
        ? buildDeliveryDateOptions(shopInfo.maxDeliveryDays || 7).filter(
            d => !d.isToday || shopInfo.sameDayDelivery !== false
        )
        : [];
    const slotOptions = shopInfo?.deliverySlotOptions?.length
        ? shopInfo.deliverySlotOptions
        : DEFAULT_DELIVERY_SLOTS;

    const selectAddress = (addr) => {

        setSelectedAddressId(String(addr.id));

        setFormData(prev => ({ ...prev, address: addr.address }));

    };



    const applyPromo = async (codeOverride) => {
        const code = (codeOverride ?? promoInput).trim().toUpperCase();
        if (!code) {
            alert('Введите промокод');
            return;
        }
        if (!token) {
            alert('Войдите в аккаунт для промокода');
            return;
        }
        if (!shopId) {
            alert('Не удалось определить магазин');
            return;
        }
        setPromoInput(code);
        try {
            const result = await validatePromoCode(token, code, Number(shopId), subtotal);
            setPromoApplied(result);
        } catch (err) {
            setPromoApplied(null);
            alert(err.response?.data?.error || 'Промокод недействителен');
        }
    };



    const validateForm = () => {

        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'Введите имя и фамилию';

        else if (formData.name.trim().length < 3) newErrors.name = 'Минимум 3 символа';



        const phoneRegex = /^(\+7|7|8)?[\s\-]?(\(?\d{3}\)?)[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})$/;

        if (!formData.phone.trim()) newErrors.phone = 'Введите номер телефона';

        else if (!phoneRegex.test(formData.phone)) newErrors.phone = 'Некорректный номер';



        if (!isPickup) {
            if (!formData.address.trim()) newErrors.address = 'Введите адрес доставки';
            else if (formData.address.trim().length < 10) newErrors.address = 'Адрес подробнее (мин. 10 символов)';
            if (!deliveryDate) newErrors.deliveryDate = 'Выберите дату доставки';
            if (!deliverySlotId) newErrors.deliverySlot = 'Выберите интервал доставки';
        }



        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;

    };



    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData(prev => ({ ...prev, [name]: value }));

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

        if (name === 'address') setSelectedAddressId('');

    };



    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!validateForm()) return;

        if (!token) {

            alert('Войдите в аккаунт для оформления заказа');

            navigate('/login');

            return;

        }



        setLoading(true);

        try {

            const orderData = {

                items: cart.map(i => ({ ...i, quantity: i.quantity || 1 })),

                deliveryInfo: {
                    ...formData,
                    address: isPickup ? 'Самовывоз из магазина' : formData.address,
                    ...( !isPickup && {
                        deliveryDate,
                        deliverySlotId,
                        deliverySlotLabel: slotOptions.find(s => s.id === deliverySlotId)?.label
                    })
                },

                total: finalTotal,

                shopId,

                promoCode: promoApplied?.code || undefined,
                isPickup

            };



            const res = await axios.post(`${API_BASE}/api/orders`, orderData, {
                headers: { Authorization: `Bearer ${token}` }
            });



            if (res.data.success) {

                clearCart();

                navigate('/success', { state: { orderId: res.data.orderId } });

            }

        } catch (err) {

            alert(err.response?.data?.error || 'Ошибка при оформлении заказа');

        } finally {

            setLoading(false);

        }

    };



    return (

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

            <h1 className={`${pageTitleClass} mb-6 sm:mb-10`}>Оформление заказа</h1>



            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">

                <div className={`${cardClass} p-5 sm:p-8`}>

                    <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6">Контактные данные</h2>



                    <div className="space-y-5 sm:space-y-6">

                        <div>

                            <label className={labelClass}>Имя и фамилия *</label>

                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass(!!errors.name)} />

                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}

                        </div>



                        <div>

                            <label className={labelClass}>Телефон *</label>

                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass(!!errors.phone)} />

                            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}

                        </div>



                        {addresses.length > 0 && (

                            <div>

                                <label className={labelClass}>Сохранённые адреса</label>

                                <div className="flex flex-wrap gap-2 mt-2">

                                    {addresses.map(a => (

                                        <button

                                            key={a.id}

                                            type="button"

                                            onClick={() => selectAddress(a)}

                                            className={`px-4 py-2 rounded-xl text-sm border transition ${

                                                selectedAddressId === String(a.id)

                                                    ? 'bg-pink-600 text-white border-pink-600'

                                                    : 'bg-white border-gray-200 hover:border-pink-400'

                                            }`}

                                        >

                                            {ADDRESS_LABELS[a.label] || a.label}

                                        </button>

                                    ))}

                                </div>

                            </div>

                        )}



                        <label className="flex items-center gap-3 cursor-pointer mb-4">
                            <input
                                type="checkbox"
                                checked={isPickup}
                                onChange={e => setIsPickup(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-pink-600"
                            />
                            <span className="text-sm font-medium">Самовывоз (заберу сам из магазина)</span>
                        </label>

                        {!isPickup && (
                        <>
                        <div>
                            <label className={labelClass}>Адрес доставки *</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClass(!!errors.address)} />
                            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Дата доставки *</label>
                                <select
                                    value={deliveryDate}
                                    onChange={e => {
                                        setDeliveryDate(e.target.value);
                                        if (errors.deliveryDate) setErrors(prev => ({ ...prev, deliveryDate: '' }));
                                    }}
                                    className={inputClass(!!errors.deliveryDate)}
                                >
                                    {dateOptions.map(d => (
                                        <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                </select>
                                {errors.deliveryDate && <p className="text-red-500 text-sm mt-1">{errors.deliveryDate}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Интервал *</label>
                                <select
                                    value={deliverySlotId}
                                    onChange={e => {
                                        setDeliverySlotId(e.target.value);
                                        if (errors.deliverySlot) setErrors(prev => ({ ...prev, deliverySlot: '' }));
                                    }}
                                    className={inputClass(!!errors.deliverySlot)}
                                >
                                    {slotOptions.map(s => (
                                        <option key={s.id} value={s.id}>{s.label}</option>
                                    ))}
                                </select>
                                {errors.deliverySlot && <p className="text-red-500 text-sm mt-1">{errors.deliverySlot}</p>}
                            </div>
                        </div>
                        </>
                        )}



                        <div>

                            <label className={labelClass}>Комментарий к заказу</label>

                            <textarea name="comment" value={formData.comment} onChange={handleChange} rows="4" className={`${inputClass()} resize-none`} />

                        </div>

                        <div>

                            <label className={labelClass}>Текст открытки (подарок)</label>

                            <textarea
                                name="giftCardMessage"
                                value={formData.giftCardMessage}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Поздравление для получателя — увидит магазин при сборке"
                                className={`${inputClass()} resize-none`}
                            />

                        </div>

                    </div>

                </div>



                <div className={`${cardClass} p-5 sm:p-8`}>
                        <h2 className="text-lg font-semibold mb-3">Промокод</h2>
                        <div className="flex gap-2">
                            <input
                                className={`${inputClass()} font-mono tracking-wider uppercase`}
                                placeholder="Введите код"
                                value={promoInput}
                                onChange={e => setPromoInput(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyPromo())}
                            />
                            <button
                                type="button"
                                onClick={() => applyPromo()}
                                className={`${btnSecondary} px-5 shrink-0`}
                            >
                                Применить
                            </button>
                        </div>

                        {promoApplied && (
                            <div className="mt-4 flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-100">
                                <span className="text-2xl">✓</span>
                                <div>
                                    <p className="font-semibold text-green-800">
                                        Промокод {promoApplied.code} применён
                                    </p>
                                    <p className="text-sm text-green-600">
                                        Скидка {promoApplied.discount.toLocaleString('ru-RU')} ₽
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setPromoApplied(null); setPromoInput(''); }}
                                    className="ml-auto text-sm text-green-700 hover:text-green-900 underline"
                                >
                                    Убрать
                                </button>
                            </div>
                        )}
                </div>



                <div className={`${cardClass} p-5 sm:p-8 space-y-2`}>

                    <div className="flex justify-between text-gray-600">

                        <span>Товары</span>

                        <span>{subtotal.toLocaleString('ru-RU')} ₽</span>

                    </div>

                    {discount > 0 && (

                        <div className="flex justify-between text-green-600">

                            <span>Скидка</span>

                            <span>−{discount.toLocaleString('ru-RU')} ₽</span>

                        </div>

                    )}

                    <div className="flex justify-between text-2xl sm:text-3xl font-bold pt-2 border-t">

                        <span>Итого:</span>

                        <span className="text-pink-600">{finalTotal.toLocaleString('ru-RU')} ₽</span>

                    </div>

                </div>



                <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-4 sm:py-5 text-lg sm:text-xl rounded-2xl sm:rounded-3xl`}>

                    {loading ? 'Оформляем заказ...' : 'Подтвердить заказ'}

                </button>

            </form>

        </div>

    );

}



export default Checkout;


