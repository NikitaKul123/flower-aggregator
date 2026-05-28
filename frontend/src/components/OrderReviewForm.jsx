import { useState } from 'react';
import StarRating from './StarRating';
import { btnPink, btnSecondary } from '../utils/ui';

export default function OrderReviewForm({ onSubmit, existingReview }) {
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [text, setText] = useState(existingReview?.text || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (existingReview) {
        return (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="font-medium text-emerald-800 mb-2">Ваш отзыв</p>
                <StarRating value={existingReview.rating} readOnly size="sm" />
                {existingReview.text && (
                    <p className="text-gray-700 mt-2 text-sm">«{existingReview.text}»</p>
                )}
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating < 1) {
            setError('Выберите оценку');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await onSubmit({ rating, text });
        } catch (err) {
            setError(err.response?.data?.error || 'Не удалось отправить отзыв');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-pink-50 border border-pink-100 rounded-2xl p-4 space-y-3">
            <p className="font-medium text-gray-900">Оцените заказ</p>
            <StarRating value={rating} onChange={setRating} />
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Расскажите о букете (необязательно)"
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:border-pink-500"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className={`${btnPink} px-5 py-2 text-sm`}>
                {loading ? 'Отправка…' : 'Отправить отзыв'}
            </button>
        </form>
    );
}
