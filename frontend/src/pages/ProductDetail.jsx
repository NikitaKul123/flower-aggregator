import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { productImageList, productImageUrl } from '../utils/productImage';
import { fetchProductReviews } from '../api/reviewsApi';
import { fetchPriceCompare } from '../api/productsApi';
import PriceCompareSection from '../components/PriceCompareSection';
import {
    fetchStockSubscription,
    subscribeStockAlert,
    unsubscribeStockAlert
} from '../api/stockAlertsApi';
import StarRating from '../components/StarRating';
import { API_BASE } from '../config/api';
import { btnPink, btnSecondary } from '../utils/ui';
import { shopRatingStars } from '../utils/shopRating';
import { isProductPurchasable } from '../utils/productAvailability';
import {
    HOME_PATH,
    HOME_SHOPS_VIEW,
    catalogPath,
    isShopsHomeView
} from '../utils/navigationPaths';
import Breadcrumbs from '../components/Breadcrumbs';

function formatReviewDate(iso) {
    return new Date(iso).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function ProductCard({ product, addToCart, wishlist, toggleWishlist }) {
    const inStock = isProductPurchasable(product);
    return (
        <div className={`bg-white rounded-2xl border overflow-hidden transition relative group ${
            inStock ? 'border-gray-100 hover:shadow-md' : 'border-gray-200 opacity-90'
        }`}>
            {!inStock && (
                <span className="absolute top-3 left-3 z-10 text-[10px] font-semibold bg-gray-800/80 text-white px-2 py-0.5 rounded-full">
                    Нет в наличии
                </span>
            )}
            <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className="absolute top-3 right-3 z-10 w-9 h-9 bg-white/90 rounded-full shadow text-lg"
            >
                {wishlist.some(i => i.id === product.id) ? '❤️' : '♡'}
            </button>
            <Link to={`/product/${product.id}`}>
                <img
                    src={productImageUrl(product)}
                    alt={product.name}
                    className={`w-full h-36 object-cover bg-gray-100 ${!inStock ? 'opacity-60 grayscale' : ''}`}
                />
            </Link>
            <div className="p-4">
                <Link to={`/product/${product.id}`} className="font-medium text-sm line-clamp-2 hover:text-pink-600">
                    {product.name}
                </Link>
                <p className="text-pink-600 font-bold mt-2">{product.price.toLocaleString('ru-RU')} ₽</p>
                {inStock ? (
                    <button
                        type="button"
                        onClick={() => addToCart(product, 1)}
                        className="mt-3 w-full text-sm bg-pink-50 text-pink-600 py-2 rounded-xl hover:bg-pink-100"
                    >
                        В корзину
                    </button>
                ) : (
                    <Link
                        to={`/product/${product.id}`}
                        className="mt-3 block w-full text-sm text-center bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200"
                    >
                        🔔 Уведомить
                    </Link>
                )}
            </div>
        </div>
    );
}

function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const fromShops =
        isShopsHomeView(searchParams) || location.state?.fromView === 'shops';
    const { addToCart, toggleWishlist, wishlist } = useContext(CartContext);
    const { user, token } = useContext(AuthContext);

    const [product, setProduct] = useState(null);
    const [similar, setSimilar] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [priceCompare, setPriceCompare] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const [stockSubscribed, setStockSubscribed] = useState(false);
    const [stockLoading, setStockLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            axios.get(`${API_BASE}/api/products/${id}`),
            axios.get(`${API_BASE}/api/products/${id}/similar`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/api/products/${id}/recommendations`).catch(() => ({ data: [] })),
            fetchProductReviews(id).catch(() => []),
            fetchPriceCompare(id).catch(() => null)
        ])
            .then(([prodRes, simRes, recRes, revs, compare]) => {
                const data = prodRes.data;
                const imgs = productImageList(data);
                data.images = imgs.length ? imgs : [];
                setProduct(data);
                setSimilar(simRes.data || []);
                setRecommendations(recRes.data || []);
                setReviews(revs || []);
                setPriceCompare(compare);
                setSelectedImage(0);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!token || !product) return;
        fetchStockSubscription(token, product.id)
            .then(d => setStockSubscribed(!!d.subscribed))
            .catch(() => {});
    }, [token, product?.id]);

    if (loading) return <div className="text-center text-2xl mt-20">🌸 Загрузка букета...</div>;
    if (!product) return <div className="text-center text-2xl mt-20">Букет не найден 😔</div>;

    const images = productImageList(product);
    const available = isProductPurchasable(product);

    const averageRating = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    const handleStockToggle = async () => {
        if (!token) {
            navigate('/login');
            return;
        }
        setStockLoading(true);
        try {
            if (stockSubscribed) {
                await unsubscribeStockAlert(token, product.id);
                setStockSubscribed(false);
            } else {
                await subscribeStockAlert(token, product.id);
                setStockSubscribed(true);
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка подписки');
        } finally {
            setStockLoading(false);
        }
    };

    const shopId = product.shopId ?? product.shop?.id;
    const shopLabel = product.shop?.name || 'Магазин';

    const breadcrumbItems = [
        { label: 'Главная', to: HOME_PATH },
        ...(fromShops ? [{ label: 'Магазины', to: HOME_SHOPS_VIEW }] : []),
        ...(shopId
            ? [{
                label: shopLabel,
                to: catalogPath(shopId, { fromShops }),
                state: { shopName: product.shop?.name }
            }]
            : []),
        { label: product.name }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            <Breadcrumbs items={breadcrumbItems} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div>
                    <div className="rounded-3xl overflow-hidden shadow-2xl mb-6 bg-gray-100 relative">
                        {!available && (
                            <span className="absolute top-4 left-4 z-10 text-sm font-semibold bg-gray-900/75 text-white px-4 py-2 rounded-full">
                                Нет в наличии
                            </span>
                        )}
                        {images.length > 0 ? (
                            <img
                                src={images[selectedImage]}
                                alt={product.name}
                                className={`w-full h-[520px] object-cover ${!available ? 'opacity-70 grayscale' : ''}`}
                            />
                        ) : (
                            <div className="w-full h-[520px] flex items-center justify-center text-gray-400">Нет фото</div>
                        )}
                    </div>
                    {images.length > 1 && (
                        <div className="grid grid-cols-4 gap-4">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedImage(idx)}
                                    className={`rounded-2xl overflow-hidden border-2 transition ${
                                        selectedImage === idx ? 'border-pink-600 scale-105' : 'border-transparent'
                                    }`}
                                >
                                    <img src={img} alt="" className="w-full h-24 object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col">
                    {product.shop && (
                        <div className="mb-1">
                            <p className="text-pink-600 font-medium">{product.shop.name}</p>
                            {shopRatingStars(product.shop) && (
                                <p className="text-sm text-yellow-600 mt-0.5">{shopRatingStars(product.shop)}</p>
                            )}
                        </div>
                    )}
                    <h1 className="text-4xl font-bold mt-2 mb-4">{product.name}</h1>

                    <div className="flex items-center gap-4 mb-6 flex-wrap">
                        <p className="text-5xl font-bold text-pink-600">
                            {product.price.toLocaleString('ru-RU')} ₽
                            <a
                                href="#price-compare"
                                className="block text-sm font-normal text-pink-600 hover:underline mt-2"
                            >
                                Сравнить цены в других магазинах ↓
                            </a>
                        </p>
                        {averageRating && (
                            <>
                                <div className="flex items-center gap-1 text-yellow-500 text-2xl">
                                    ★ {averageRating}
                                </div>
                                <span className="text-gray-500">({reviews.length} отзывов)</span>
                            </>
                        )}
                    </div>

                    <p className="text-gray-600 text-[17px] leading-relaxed mb-6">{product.description}</p>

                    {!available && (
                        <div className="mb-6 space-y-3 p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
                            <p className="text-gray-800 font-semibold">Сейчас нет в наличии</p>
                            <p className="text-sm text-gray-600">
                                Оформить заказ нельзя, но можно подписаться — пришлём уведомление, когда товар снова появится.
                            </p>
                            <button
                                type="button"
                                onClick={handleStockToggle}
                                disabled={stockLoading}
                                className={`${btnPink} w-full py-3`}
                            >
                                {stockLoading
                                    ? '…'
                                    : stockSubscribed
                                        ? '✓ Вы подписаны — отменить'
                                        : '🔔 Сообщить о появлении'}
                            </button>
                            {!token && (
                                <p className="text-xs text-gray-500 text-center">
                                    Нужен{' '}
                                    <Link to="/login" className="text-pink-600 hover:underline">вход</Link>
                                    {' '}в аккаунт
                                </p>
                            )}
                        </div>
                    )}

                    {available && (
                    <div className="mb-8">
                        <label className="block text-sm font-medium mb-3">Количество</label>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-14 h-14 border-2 rounded-2xl text-3xl hover:bg-gray-100">-</button>
                            <span className="text-3xl font-semibold w-16 text-center">{quantity}</span>
                            <button type="button" onClick={() => setQuantity(q => q + 1)} className="w-14 h-14 border-2 rounded-2xl text-3xl hover:bg-gray-100">+</button>
                        </div>
                    </div>
                    )}

                    <div className="space-y-4 mt-auto">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => available && addToCart(product, quantity)}
                                disabled={!available}
                                className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white py-5 rounded-3xl text-xl font-semibold hover:from-pink-700 hover:to-rose-700 transition disabled:opacity-50"
                            >
                                {available ? 'Добавить в корзину' : 'Нет в наличии'}
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleWishlist(product)}
                                className="w-16 h-16 border-2 border-gray-300 rounded-3xl text-4xl hover:bg-red-50"
                            >
                                {wishlist.some(item => item.id === product.id) ? '❤️' : '♡'}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => { if (available) { addToCart(product, quantity); navigate('/cart'); } }}
                            disabled={!available}
                            className="w-full border-2 border-pink-600 text-pink-600 py-5 rounded-3xl text-xl font-semibold hover:bg-pink-50 disabled:opacity-50"
                        >
                            Купить сразу
                        </button>
                    </div>
                </div>
            </div>

            <PriceCompareSection product={product} compare={priceCompare} />

            {similar.length > 0 && (
                <section className="mt-16">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6">Похожие товары</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        {similar.map(p => (
                            <ProductCard key={p.id} product={p} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                        ))}
                    </div>
                </section>
            )}

            {recommendations.length > 0 && (
                <section className="mt-16">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6">С этим букетом берут</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        {recommendations.map(rec => (
                            <ProductCard key={rec.id} product={rec} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                        ))}
                    </div>
                </section>
            )}

            <section className="mt-16">
                <h2 className="text-3xl font-bold mb-8">Отзывы покупателей</h2>
                {reviews.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reviews.map(review => (
                            <div key={review.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-semibold">{review.userName}</p>
                                        <p className="text-sm text-gray-500">{formatReviewDate(review.createdAt)}</p>
                                    </div>
                                    <StarRating value={review.rating} readOnly size="sm" />
                                </div>
                                {review.text && (
                                    <p className="text-gray-700 leading-relaxed">«{review.text}»</p>
                                )}
                                {review.shopReply && (
                                    <p className="text-sm text-pink-900 bg-pink-50 rounded-xl p-3 mt-3 border border-pink-100">
                                        <span className="font-medium">Ответ магазина: </span>
                                        {review.shopReply}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 rounded-2xl p-6">
                        Пока нет отзывов. Оставить отзыв можно в разделе «Мои заказы» после доставки.
                    </p>
                )}
                {!user && (
                    <p className="mt-4 text-sm text-gray-500">
                        <Link to="/login" className="text-pink-600 hover:underline">Войдите</Link>, чтобы оставить отзыв после покупки.
                    </p>
                )}
            </section>
        </div>
    );
}

export default ProductDetail;
