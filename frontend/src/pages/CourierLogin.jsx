import { useState, useContext } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { courierLogin } from '../api/courierApi';
import { btnPink, inputClass, labelClass, cardClass } from '../utils/ui';

function CourierLogin() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user, loading: authLoading } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!authLoading && user?.role === 'COURIER') {
        return <Navigate to="/courier/orders" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await courierLogin(formData.email, formData.password);
            login(res.token, res.user);
            navigate('/courier/orders');
        } catch (err) {
            setError(err.response?.data?.error || 'Неверный email или пароль');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center py-12 px-4">
            <div className={`${cardClass} w-full max-w-md p-8`}>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход для курьера</h1>
                <p className="text-gray-500 text-sm mb-6">{formData.email ? '' : 'Аккаунт выдаёт магазин'}</p>
                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelClass}>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className={inputClass()}
                            required
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Пароль</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className={inputClass()}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className={`${btnPink} w-full py-3`}>
                        {loading ? 'Вход…' : 'Войти'}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-gray-500">
                    <Link to="/login" className="text-pink-600 hover:underline">Вход для клиентов</Link>
                    {' · '}
                    <Link to="/shop/login" className="text-pink-600 hover:underline">Магазин</Link>
                </p>
            </div>
        </div>
    );
}

export default CourierLogin;
