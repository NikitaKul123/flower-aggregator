import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config/api';

function ShopRegister() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        shopName: '',
        address: '',
        deliveryTime: '60-90 мин'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post(`${API_BASE}/api/shop-auth/register`, formData);
            alert('Магазин успешно зарегистрирован! Теперь войдите в панель.');
            navigate('/shop/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto mt-10 px-4">
            <h1 className="text-4xl font-bold text-center mb-8">Регистрация магазина</h1>

            {error && <p className="bg-red-100 text-red-700 p-4 rounded-2xl mb-6">{error}</p>}

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow space-y-5">
                <input type="text" name="shopName" placeholder="Название магазина" onChange={e => setFormData({...formData, shopName: e.target.value})} required className="w-full border rounded-2xl px-5 py-4" />
                <input type="text" name="address" placeholder="Адрес магазина" onChange={e => setFormData({...formData, address: e.target.value})} required className="w-full border rounded-2xl px-5 py-4" />

                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="name" placeholder="Ваше имя" onChange={e => setFormData({...formData, name: e.target.value})} required className="border rounded-2xl px-5 py-4" />
                    <input type="tel" name="phone" placeholder="Телефон" onChange={e => setFormData({...formData, phone: e.target.value})} className="border rounded-2xl px-5 py-4" />
                </div>

                <input type="email" name="email" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} required className="w-full border rounded-2xl px-5 py-4" />
                <input type="password" name="password" placeholder="Пароль" onChange={e => setFormData({...formData, password: e.target.value})} required className="w-full border rounded-2xl px-5 py-4" />

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-5 rounded-3xl text-lg font-semibold">
                    {loading ? 'Регистрация...' : 'Зарегистрировать магазин'}
                </button>
            </form>

            <p className="text-center mt-6">
                Уже есть аккаунт? <Link to="/shop/login" className="text-pink-600">Войти как магазин</Link>
            </p>
        </div>
    );
}

export default ShopRegister;