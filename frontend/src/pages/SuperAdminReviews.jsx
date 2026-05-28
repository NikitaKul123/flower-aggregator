import { useContext, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    fetchSuperAdminReviews,
    deleteSuperAdminReview,
    deleteSuperAdminReviewReply
} from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, btnSecondary } from '../utils/ui';
import StarRating from '../components/StarRating';

export default function SuperAdminReviews() {
    const { token } = useContext(AuthContext);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            setReviews(await fetchSuperAdminReviews(token));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = async (id) => {
        if (!window.confirm('Удалить отзыв?')) return;
        try {
            await deleteSuperAdminReview(token, id);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    const removeReply = async (id) => {
        if (!window.confirm('Удалить ответ магазина?')) return;
        try {
            await deleteSuperAdminReviewReply(token, id);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <SuperAdminLayout title="Отзывы">
            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : (
                <div className="space-y-4">
                    {reviews.map((r) => (
                        <div key={r.id} className={`${cardClass} p-4`}>
                            <div className="flex flex-wrap justify-between gap-2 mb-2">
                                <div>
                                    <StarRating value={r.rating} readOnly size="sm" />
                                    <p className="text-sm text-gray-500 mt-1">
                                        {r.user?.name} · заказ{' '}
                                        <Link
                                            to={`/super-admin/orders/${r.orderId}`}
                                            className="text-violet-600 hover:underline"
                                        >
                                            №{r.orderId}
                                        </Link>
                                        {' '}· {r.order?.shop?.name}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {new Date(r.createdAt).toLocaleString('ru-RU')}
                                </span>
                            </div>
                            {r.text && <p className="text-gray-800">{r.text}</p>}
                            {r.shopReply && (
                                <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                                    <strong>Магазин:</strong> {r.shopReply}
                                </p>
                            )}
                            <div className="flex gap-2 mt-3">
                                {r.shopReply && (
                                    <button
                                        type="button"
                                        onClick={() => removeReply(r.id)}
                                        className={`${btnSecondary} text-xs px-3 py-1.5`}
                                    >
                                        Удалить ответ
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => remove(r.id)}
                                    className={`${btnSecondary} text-xs px-3 py-1.5 text-red-600`}
                                >
                                    Удалить отзыв
                                </button>
                            </div>
                        </div>
                    ))}
                    {reviews.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Отзывов нет</p>
                    )}
                </div>
            )}
        </SuperAdminLayout>
    );
}
