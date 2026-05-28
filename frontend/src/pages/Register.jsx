import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../config/api';

function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(`${API_BASE}/api/auth/register`, formData);

            // Автоматический вход после регистрации
            const loginRes = await axios.post(`${API_BASE}/api/auth/login`, {
                email: formData.email,
                password: formData.password
            });

            login(loginRes.data.token, loginRes.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-8 sm:mt-12 px-4 sm:px-6 pb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8">Регистрация</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-2xl mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">Имя и фамилия</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:border-pink-500 outline-none"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:border-pink-500 outline-none"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Телефон</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:border-pink-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Пароль</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:border-pink-500 outline-none"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-5 rounded-3xl text-lg font-semibold hover:from-pink-700 hover:to-rose-700 transition disabled:opacity-70"
                >
                    {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
            </form>

            <p className="text-center mt-6 text-gray-600">
                Уже есть аккаунт?{' '}
                <Link to="/login" className="text-pink-600 hover:underline font-medium">
                    Войти
                </Link>
            </p>
        </div>
    );
}

export default Register;