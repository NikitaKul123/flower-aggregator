import { useEffect, useState } from 'react';
import { fetchPublicPromos } from '../api/promosApi';
import { copyToClipboard } from '../utils/clipboard';

function formatDiscount(p) {
    if (p.discountType === 'PERCENT') return `−${p.discountValue}%`;
    return `−${p.discountValue.toLocaleString('ru-RU')} ₽`;
}

function ShopPromoBanner({ shopId, className = '', variant = 'admin' }) {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(null);
    const isCatalog = variant === 'catalog';

    useEffect(() => {
        if (!shopId) {
            setPromos([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        fetchPublicPromos(shopId)
            .then(setPromos)
            .catch(() => setPromos([]))
            .finally(() => setLoading(false));
    }, [shopId]);

    const handleCopy = async (code) => {
        const ok = await copyToClipboard(code);
        if (ok) {
            setCopied(code);
            setTimeout(() => setCopied(null), 2000);
        }
    };

    if (loading) {
        if (isCatalog) {
            return (
                <div className={`h-24 bg-pink-50 animate-pulse rounded-2xl border border-pink-100 ${className}`} />
            );
        }
        return <div className={`h-20 bg-gray-100 animate-pulse rounded-xl ${className}`} />;
    }

    if (!promos.length) {
        if (isCatalog) return null;
        return (
            <p className={`text-sm text-gray-400 ${className}`}>
                Нет активных промокодов для покупателей
            </p>
        );
    }

    if (isCatalog) {
        return (
            <section className={`bg-pink-50 border border-pink-100 rounded-2xl p-4 sm:p-5 ${className}`}>
                <h2 className="font-semibold text-pink-800 mb-3 flex items-center gap-2">
                    <span>🏷️</span> Промокоды магазина
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {promos.map(p => (
                        <div
                            key={p.code}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white"
                        >
                            <div className="min-w-0">
                                <span className="font-mono font-bold">{p.code}</span>
                                <span className="ml-2 text-pink-100 text-sm">{formatDiscount(p)}</span>
                                {p.minOrder > 0 && (
                                    <p className="text-pink-200/90 text-xs mt-0.5">
                                        от {p.minOrder.toLocaleString('ru-RU')} ₽
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleCopy(p.code)}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/25 hover:bg-white/35 text-xs font-medium"
                            >
                                {copied === p.code ? '✓' : 'Копировать'}
                            </button>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-pink-700/70 mt-3">Введите код при оформлении заказа</p>
            </section>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {promos.map(p => (
                <div
                    key={p.code}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm"
                >
                    <div>
                        <span className="font-mono font-bold">{p.code}</span>
                        <span className="ml-2 text-pink-100">{formatDiscount(p)}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleCopy(p.code)}
                        className="px-2 py-1 rounded-lg bg-white/20 text-xs hover:bg-white/30"
                    >
                        {copied === p.code ? '✓' : 'Копировать'}
                    </button>
                </div>
            ))}
        </div>
    );
}

export default ShopPromoBanner;
