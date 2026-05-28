import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { isCustomerUser } from '../utils/roles';

/**
 * Подписка на новинки магазина и избранное магазина
 */
export default function ShopActionButtons({ shop, className = '', compact = false }) {
    const navigate = useNavigate();
    const { token, user } = useContext(AuthContext);
    const {
        subscribedShopIds,
        favoriteShopIds,
        toggleShopSubscription,
        toggleShopFavorite
    } = useContext(CartContext);

    const shopId = shop?.id;
    const isCustomer = isCustomerUser(user);
    const [loading, setLoading] = useState(false);

    const subscribed = shopId ? subscribedShopIds.includes(shopId) : false;
    const favorited = shopId ? favoriteShopIds.includes(shopId) : false;

    useEffect(() => {
        setLoading(false);
    }, [subscribed, favorited]);

    if (!shopId || !isCustomer) return null;

    const requireAuth = (action) => {
        if (!token) {
            navigate('/login');
            return;
        }
        action();
    };

    const onSubscribe = () => {
        requireAuth(async () => {
            setLoading(true);
            try {
                await toggleShopSubscription(shop);
            } finally {
                setLoading(false);
            }
        });
    };

    const onFavorite = () => {
        requireAuth(async () => {
            setLoading(true);
            try {
                await toggleShopFavorite(shop);
            } finally {
                setLoading(false);
            }
        });
    };

    const btnClass = compact
        ? 'w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md backdrop-blur-md transition'
        : 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition disabled:opacity-60';

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                type="button"
                disabled={loading}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSubscribe(); }}
                title={subscribed ? 'Отписаться от новинок' : 'Подписаться на новинки магазина'}
                className={
                    compact
                        ? `${btnClass} ${subscribed ? 'bg-pink-600 text-white' : 'bg-white/95 text-gray-600 hover:text-pink-600'}`
                        : `${btnClass} border ${subscribed ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 bg-white text-gray-700 hover:border-pink-300'}`
                }
            >
                {compact ? '🔔' : (subscribed ? '✓ Подписка' : '🔔 Подписаться')}
            </button>
            <button
                type="button"
                disabled={loading}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFavorite(); }}
                title={favorited ? 'Убрать из избранного' : 'В избранное'}
                className={
                    compact
                        ? `${btnClass} ${favorited ? 'bg-rose-500 text-white' : 'bg-white/95 text-gray-600 hover:text-rose-500'}`
                        : `${btnClass} border ${favorited ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 bg-white text-gray-700 hover:border-rose-300'}`
                }
            >
                {compact ? (favorited ? '❤️' : '♡') : (favorited ? '❤️ В избранном' : '♡ В избранное')}
            </button>
        </div>
    );
}
