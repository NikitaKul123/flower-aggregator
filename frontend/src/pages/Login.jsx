import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../config/api';

function Login() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(`${API_BASE}/api/auth/login`, formData);

            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка входа');
        } finally {
            setLoading(false);
        }
    };

    const isWrongRoleError =
        error.toLowerCase().includes('магазин') ||
        error.toLowerCase().includes('shop');

    return (
        <div className="max-w-md mx-auto mt-12 sm:mt-20 px-4 sm:px-6 pb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8">Вход</h1>

            {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded-2xl mb-6 space-y-2">
                    <p>{error}</p>

                    {isWrongRoleError && (
                        <Link
                            to="/shop/login"
                            className="block text-pink-600 font-semibold hover:underline"
                        >
                            👉 Перейти во вход для магазина
                        </Link>
                    )}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="space-y-6 bg-white p-8 rounded-3xl shadow"
            >
                <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full border rounded-2xl px-5 py-4"
                    required
                />

                <input
                    type="password"
                    placeholder="Пароль"
                    value={formData.password}
                    onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full border rounded-2xl px-5 py-4"
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-pink-600 text-white py-4 rounded-2xl font-semibold hover:bg-pink-700"
                >
                    {loading ? 'Вход...' : 'Войти'}
                </button>
            </form>

            <p className="text-center mt-6">
                Нет аккаунта?{' '}
                <Link to="/register" className="text-pink-600">
                    Зарегистрироваться
                </Link>
            </p>

            <p className="text-center mt-3 text-sm text-gray-500">
                Вход для магазинов:{' '}
                <Link to="/shop/login" className="text-pink-600 font-medium">
                    перейти
                </Link>
            </p>
        </div>
    );
}

export default Login;