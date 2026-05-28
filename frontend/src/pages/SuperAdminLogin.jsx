import { useContext, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { superAdminLogin } from '../api/superAdminApi';
import { isSuperAdminUser } from '../utils/roles';
import { cardClass, pageTitleClass, btnPink, inputClass } from '../utils/ui';

export default function SuperAdminLogin() {
    const { login, user, loading: authLoading } = useContext(AuthContext);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!authLoading && isSuperAdminUser(user)) {
        return <Navigate to="/super-admin" replace />;
    }

    if (authLoading) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center text-gray-500">
                Загрузка…
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const data = await superAdminLogin(email, password);
            login(data.token, data.user);
            navigate('/super-admin');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка входа');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-16">
            <div className={`${cardClass} p-8`}>
                <h1 className={pageTitleClass}>Панель владельца</h1>
                <p className="text-sm text-gray-500 mt-2 mb-6">
                    Супер-админ платформы — полный доступ ко всем магазинам, заказам и пользователям.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className={inputClass()}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                        <input
                            type="password"
                            required
                            className={inputClass()}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`${btnPink} w-full py-3 disabled:opacity-60`}
                    >
                        {submitting ? 'Вход…' : 'Войти'}
                    </button>
                </form>
            </div>
        </div>
    );
}
