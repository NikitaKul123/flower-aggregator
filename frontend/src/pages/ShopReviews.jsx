import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ShopAuthGate from '../components/ShopAuthGate';
import StarRating from '../components/StarRating';
import ShopReviewReplyBox from '../components/ShopReviewReplyBox';
import { fetchShopReviews } from '../api/shopReviewsApi';
import { cardClass, pageTitleClass } from '../utils/ui';

function ShopReviewsContent() {
    const { token } = useContext(AuthContext);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const load = () => {
        if (!token) return;
        setLoading(true);
        setLoadError('');
        fetchShopReviews(token)
            .then(setReviews)
            .catch(err => {
                setLoadError(err.response?.data?.error || 'Не удалось загрузить отзывы');
                setReviews([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, [token]);

    const pendingCount = reviews.filter(r => !r.shopReply).length;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <div>
                    <h1 className={pageTitleClass}>Отзывы клиентов</h1>
                    <p className="text-gray-500 text-sm mt-2">
                        Ответ видят все покупатели в «Мои заказы» и на странице товара.
                    </p>
                </div>
                <Link to="/shop/dashboard" className="text-pink-600 hover:underline text-sm shrink-0">
                    ← Дашборд
                </Link>
            </div>

            <div className={`${cardClass} p-5 mb-6 border-pink-100 bg-pink-50/50 text-sm`}>
                <p className="font-semibold text-gray-900 mb-2">Как отвечать</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                    <li>Найдите отзыв в списке ниже (или в заказе: Заказы → Подробнее).</li>
                    <li>Напишите ответ в поле и нажмите «Опубликовать ответ».</li>
                    <li>Ответ можно изменить кнопкой «Обновить ответ».</li>
                </ol>
                {pendingCount > 0 && (
                    <p className="mt-3 text-pink-800 font-medium">
                        Без ответа: {pendingCount}
                    </p>
                )}
            </div>

            {loadError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm">
                    {loadError}
                    <button type="button" onClick={load} className="block mt-2 underline">
                        Повторить
                    </button>
                </div>
            )}

            {loading ? (
                <p className="text-gray-500 text-center py-16">Загрузка…</p>
            ) : reviews.length === 0 ? (
                <p className={`${cardClass} p-8 text-center text-gray-500`}>
                    Пока нет отзывов. Они появятся после доставки заказа, когда клиент оценит покупку.
                </p>
            ) : (
                <ul className="space-y-4">
                    {reviews.map(r => (
                        <li key={r.id} className={`${cardClass} p-5 sm:p-6`}>
                            <div className="flex justify-between gap-4 mb-3">
                                <div>
                                    <p className="font-semibold">{r.user?.name || 'Клиент'}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        <Link
                                            to="/shop/orders"
                                            className="text-pink-600 hover:underline"
                                        >
                                            Заказ №{r.orderId}
                                        </Link>
                                        {' · '}
                                        {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                                    </p>
                                </div>
                                <StarRating value={r.rating} readOnly size="sm" />
                            </div>
                            <ShopReviewReplyBox
                                token={token}
                                review={r}
                                onUpdated={updated =>
                                    setReviews(prev =>
                                        prev.map(x => (x.id === r.id ? { ...x, ...updated } : x))
                                    )
                                }
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function ShopReviews() {
    return (
        <ShopAuthGate>
            <ShopReviewsContent />
        </ShopAuthGate>
    );
}
