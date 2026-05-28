export default function StarRating({ value, onChange, readOnly = false, size = 'md' }) {
    const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };
    const cls = sizes[size] || sizes.md;

    return (
        <div className={`flex gap-1 ${cls}`} role={readOnly ? 'img' : 'group'} aria-label={`Оценка ${value} из 5`}>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange?.(star)}
                    className={`transition ${readOnly ? 'cursor-default' : 'hover:scale-110'} ${
                        star <= value ? 'text-yellow-500' : 'text-gray-300'
                    }`}
                >
                    ★
                </button>
            ))}
        </div>
    );
}
