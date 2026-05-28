import { useEffect, useState } from 'react';
import { copyToClipboard } from '../utils/clipboard';

function formatDiscount(p) {
    if (p.discountType === 'PERCENT') return `−${p.discountValue}%`;
    return `−${p.discountValue.toLocaleString('ru-RU')} ₽`;
}

function PromoToast({ promos, shopName, onClose, offset = 0 }) {
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        const timer = setTimeout(onClose, 12000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const handleCopy = async (code, e) => {
        e.stopPropagation();
        const ok = await copyToClipboard(code);
        if (ok) {
            setCopied(code);
            setTimeout(() => setCopied(null), 2000);
        }
    };

    return (
        <div
            style={{ top: `${16 + offset}px` }}
            className="fixed left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] animate-slide-in"
        >
            <div className="rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-pink-500 via-pink-600 to-rose-600 text-white">
                <div className="p-4 pb-3 flex items-start gap-3">
                    <span className="text-2xl shrink-0">🏷️</span>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base leading-snug">
                            {shopName ? `Промокоды в «${shopName}»` : 'Промокоды магазина'}
                        </p>
                        <p className="text-pink-100 text-xs mt-0.5">
                            Скопируйте код и введите при оформлении заказа
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white text-xl leading-none shrink-0 p-1"
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                </div>

                <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                    {promos.map(p => (
                        <div
                            key={p.code}
                            className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5"
                        >
                            <div className="flex-1 min-w-0">
                                <span className="font-mono font-bold tracking-wide">{p.code}</span>
                                <span className="text-pink-100 text-sm ml-2">{formatDiscount(p)}</span>
                                {p.minOrder > 0 && (
                                    <p className="text-pink-200/80 text-[11px] mt-0.5">
                                        от {p.minOrder.toLocaleString('ru-RU')} ₽
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={(e) => handleCopy(p.code, e)}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/25 hover:bg-white/35 text-xs font-medium transition"
                            >
                                {copied === p.code ? '✓' : 'Копировать'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PromoToast;
