import { useState } from 'react';
import StarRating from './StarRating';
import { btnPink } from '../utils/ui';
import { replyToReview } from '../api/shopReviewsApi';

export default function ShopReviewReplyBox({ token, review, onUpdated, compact = false }) {
    const [text, setText] = useState(review?.shopReply || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    if (!review) return null;

    const submit = async () => {
        const trimmed = text.trim();
        if (!trimmed) {
            setError('Введите текст ответа');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const updated = await replyToReview(token, review.id, trimmed);
            onUpdated?.({ ...review, ...updated, shopReply: trimmed });
        } catch (err) {
            setError(err.response?.data?.error || 'Не удалось сохранить ответ');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className={
                compact
                    ? 'mt-4 pt-4 border-t border-gray-100'
                    : 'rounded-2xl border border-pink-100 bg-pink-50/40 p-4 sm:p-5'
            }
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-900">Отзыв клиента</p>
                <StarRating value={review.rating} readOnly size="sm" />
            </div>
            {review.text && (
                <p className="text-sm text-gray-700 bg-white rounded-xl p-3 mb-3 border border-gray-100">
                    «{review.text}»
                </p>
            )}
            {review.shopReply && (
                <p className="text-sm text-pink-900 bg-white rounded-xl p-3 mb-3 border border-pink-100">
                    <span className="font-medium">Ваш ответ: </span>
                    {review.shopReply}
                </p>
            )}
            <label className="block text-xs font-medium text-gray-600 mb-1">
                {review.shopReply ? 'Изменить ответ' : 'Ответ покупателю'}
            </label>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={compact ? 2 : 3}
                placeholder="Поблагодарите за отзыв или объясните ситуацию…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white"
            />
            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
            <button
                type="button"
                disabled={saving}
                onClick={submit}
                className={`${btnPink} mt-2 px-4 py-2 text-sm disabled:opacity-60`}
            >
                {saving ? 'Сохранение…' : review.shopReply ? 'Обновить ответ' : 'Опубликовать ответ'}
            </button>
        </div>
    );
}
