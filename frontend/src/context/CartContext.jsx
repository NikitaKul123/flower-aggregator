import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { fetchWishlist, toggleWishlistApi, removeWishlistApi } from '../api/wishlistApi';
import {
    fetchSubscribedShopIds,
    subscribeToShop,
    unsubscribeFromShop,
    fetchFavoriteShopIds,
    toggleShopFavoriteApi,
    fetchFavoriteShops
} from '../api/shopSocialApi';
import { isProductPurchasable } from '../utils/productAvailability';
import { isCustomerUser } from '../utils/roles';

export const CartContext = createContext();

const CART_STORAGE_KEY = 'flower_cart';

function readCartFromStorage() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export const CartProvider = ({ children }) => {
    const { token, user } = useContext(AuthContext);
    const [cart, setCart] = useState(readCartFromStorage);
    const [wishlist, setWishlist] = useState([]);
    const [favoriteShops, setFavoriteShops] = useState([]);
    const [favoriteShopIds, setFavoriteShopIds] = useState([]);
    const [subscribedShopIds, setSubscribedShopIds] = useState([]);

    const isCustomer = isCustomerUser(user);

    const loadWishlist = useCallback(async () => {
        if (!token || !isCustomer) {
            if (!token) {
                const saved = localStorage.getItem('wishlist');
                if (saved) setWishlist(JSON.parse(saved));
            }
            return;
        }
        try {
            const products = await fetchWishlist(token);
            setWishlist(products);
            localStorage.removeItem('wishlist');
        } catch (e) {
            console.error(e);
        }
    }, [token, isCustomer]);

    const loadShopSocial = useCallback(async () => {
        if (!token || !isCustomer) {
            setFavoriteShops([]);
            setFavoriteShopIds([]);
            setSubscribedShopIds([]);
            return;
        }
        try {
            const [favIds, subIds, favShops] = await Promise.all([
                fetchFavoriteShopIds(token),
                fetchSubscribedShopIds(token),
                fetchFavoriteShops(token)
            ]);
            setFavoriteShopIds(favIds);
            setSubscribedShopIds(subIds);
            setFavoriteShops(favShops);
        } catch (e) {
            console.error(e);
        }
    }, [token, isCustomer]);

    useEffect(() => {
        loadWishlist();
        loadShopSocial();
    }, [loadWishlist, loadShopSocial]);

    useEffect(() => {
        if (!token && wishlist.length >= 0) {
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
        }
    }, [wishlist, token]);

    useEffect(() => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product, qty = 1) => {
        if (!isProductPurchasable(product)) {
            window.dispatchEvent(
                new CustomEvent('cart-added', {
                    detail: {
                        message: 'Товар сейчас недоступен. Подпишитесь на уведомление на странице товара.',
                        link: `/product/${product.id}`
                    }
                })
            );
            return;
        }
        const shopId = product.shopId ?? product.shop?.id;
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i =>
                    i.id === product.id
                        ? { ...i, quantity: (i.quantity || 1) + qty, shopId: i.shopId ?? shopId }
                        : i
                );
            }
            return [...prev, { ...product, shopId, cartId: `p-${product.id}`, quantity: qty }];
        });
        window.dispatchEvent(
            new CustomEvent('cart-added', {
                detail: {
                    message: `«${product.name}» в корзине`,
                    link: '/cart'
                }
            })
        );
    };

    const removeFromCart = (cartId) => {
        setCart(prev => prev.filter(item => item.cartId !== cartId));
    };

    const updateQuantity = (cartId, delta) => {
        setCart(prev =>
            prev
                .map(item => {
                    if (item.cartId !== cartId) return item;
                    const next = (item.quantity || 1) + delta;
                    if (next < 1) return null;
                    return { ...item, quantity: next };
                })
                .filter(Boolean)
        );
    };

    const clearCart = () => setCart([]);

    const toggleWishlist = async (product) => {
        if (token && isCustomer) {
            try {
                const inWishlist = await toggleWishlistApi(product.id, token);
                if (inWishlist) {
                    setWishlist(prev =>
                        prev.some(p => p.id === product.id) ? prev : [...prev, product]
                    );
                } else {
                    setWishlist(prev => prev.filter(p => p.id !== product.id));
                }
            } catch (e) {
                console.error(e);
            }
            return;
        }
        const exists = wishlist.some(item => item.id === product.id);
        if (exists) {
            setWishlist(prev => prev.filter(item => item.id !== product.id));
        } else {
            setWishlist(prev => [...prev, product]);
        }
    };

    const toggleShopSubscription = async (shop) => {
        if (!token || !isCustomer || !shop?.id) return;
        const shopId = shop.id;
        const subscribed = subscribedShopIds.includes(shopId);
        try {
            if (subscribed) {
                await unsubscribeFromShop(token, shopId);
                setSubscribedShopIds((prev) => prev.filter((id) => id !== shopId));
            } else {
                await subscribeToShop(token, shopId);
                setSubscribedShopIds((prev) => [...prev, shopId]);
            }
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const toggleShopFavorite = async (shop) => {
        if (!token || !isCustomer || !shop?.id) return;
        const shopId = shop.id;
        try {
            const favorite = await toggleShopFavoriteApi(token, shopId);
            if (favorite) {
                setFavoriteShopIds((prev) => (prev.includes(shopId) ? prev : [...prev, shopId]));
                setFavoriteShops((prev) =>
                    prev.some((s) => s.id === shopId) ? prev : [...prev, shop]
                );
            } else {
                setFavoriteShopIds((prev) => prev.filter((id) => id !== shopId));
                setFavoriteShops((prev) => prev.filter((s) => s.id !== shopId));
            }
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const removeFromWishlist = async (id) => {
        if (token && isCustomer) {
            try {
                await removeWishlistApi(id, token);
            } catch (e) {
                console.error(e);
            }
        }
        setWishlist(prev => prev.filter(item => item.id !== id));
    };

    const cartCount = cart.reduce((n, i) => n + (i.quantity || 1), 0);
    const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

    return (
        <CartContext.Provider value={{
            cart,
            wishlist,
            cartCount,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            toggleWishlist,
            removeFromWishlist,
            total,
            reloadWishlist: loadWishlist,
            favoriteShops,
            favoriteShopIds,
            subscribedShopIds,
            toggleShopSubscription,
            toggleShopFavorite,
            reloadShopSocial: loadShopSocial
        }}>
            {children}
        </CartContext.Provider>
    );
};
