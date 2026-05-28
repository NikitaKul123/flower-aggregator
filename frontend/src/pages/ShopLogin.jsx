import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../config/api';

function ShopLogin() {

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);

    const navigate = useNavigate();

    // ================= INPUT CHANGE =================

    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // ================= SUBMIT =================

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(`${API_BASE}/api/shop-auth/login`, formData);

            login(res.data.token, res.data.user);

            // 🚨 ВАЖНО: всегда ведём в shop dashboard
            navigate('/shop/dashboard');

        } catch (err) {
            setError(err.response?.data?.error || 'Неверный email или пароль');
        } finally {
            setLoading(false);
        }
    };

    // ================= UI =================

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center py-12 px-4">

            <div className="max-w-md w-full">

                {/* HEADER */}

                <div className="text-center mb-10">

                    <div className="text-6xl mb-4">
                        🛍️
                    </div>

                    <h1 className="text-4xl font-bold text-gray-900">
                        Панель магазина
                    </h1>

                    <p className="text-gray-600 mt-2">
                        Войдите в аккаунт магазина
                    </p>

                </div>

                {/* CARD */}

                <div className="bg-white rounded-3xl shadow-xl p-10">

                    {error && (
                        <div className="bg-red-100 border border-red-300 text-red-700 px-5 py-3 rounded-2xl mb-6 text-center">
                            {error}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-6"
                    >

                        {/* EMAIL */}

                        <div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>

                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="shop@example.com"
                                required
                                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none focus:border-pink-500 transition"
                            />

                        </div>

                        {/* PASSWORD */}

                        <div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Пароль
                            </label>

                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none focus:border-pink-500 transition"
                            />

                        </div>

                        {/* BUTTON */}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-5 rounded-3xl text-lg font-semibold hover:from-pink-700 hover:to-rose-700 transition disabled:opacity-70"
                        >

                            {loading
                                ? 'Вход...'
                                : 'Войти как продавец'}

                        </button>

                    </form>

                    {/* REGISTER */}

                    <div className="mt-8 text-center">

                        <p className="text-gray-600">

                            Нет аккаунта магазина?{' '}

                            <Link
                                to="/shop/register"
                                className="text-pink-600 font-medium hover:underline"
                            >
                                Зарегистрировать магазин
                            </Link>

                        </p>

                    </div>

                </div>

                {/* CUSTOMER LOGIN */}

                <div className="text-center mt-6">

                    <Link
                        to="/login"
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ← Войти как покупатель
                    </Link>

                </div>

            </div>

        </div>
    );
}

export default ShopLogin;