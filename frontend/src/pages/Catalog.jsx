import { useEffect, useState, useContext, useMemo } from 'react';
import { useParams, useLocation, useSearchParams, Link, Navigate } from 'react-router-dom';
import axios from 'axios';

import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { productImageUrl } from '../utils/productImage';
import { filterAndSortProducts, collectCategories } from '../utils/catalogFilters';
import { btnSecondary } from '../utils/ui';
import { API_BASE } from '../config/api';
import { isProductPurchasable } from '../utils/productAvailability';
import { HOME_PATH, HOME_SHOPS_VIEW, isShopsHomeView, productPath } from '../utils/navigationPaths';
import Breadcrumbs from '../components/Breadcrumbs';
import ShopActionButtons from '../components/ShopActionButtons';

function Catalog() {

    const { user } = useContext(AuthContext);
    const { addToCart, toggleWishlist, wishlist } = useContext(CartContext);
    const isShop = user?.role === 'SHOP_ADMIN';

    const { shopId: shopIdParam } = useParams();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const fromShops = isShopsHomeView(searchParams);
    const shopId = shopIdParam ? Number(shopIdParam) : null;
    const shopName =
        location.state?.shopName ||
        (shopId ? sessionStorage.getItem(`shopName_${shopId}`) : null);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sortBy, setSortBy] = useState('default');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [shopMeta, setShopMeta] = useState(null);

    useEffect(() => {
        if (shopId && location.state?.shopName) {
            sessionStorage.setItem(`shopName_${shopId}`, location.state.shopName);
        }
    }, [shopId, location.state?.shopName]);

    // ================= LOAD PRODUCTS =================

    useEffect(() => {

        if (!shopId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        Promise.all([
            axios.get(`${API_BASE}/api/products/shop/${shopId}`),
            axios.get(`${API_BASE}/api/shops/${shopId}`).catch(() => ({ data: null }))
        ])
            .then(([prodRes, shopRes]) => {
                const list = prodRes.data || [];
                setProducts(list);
                if (shopRes.data) {
                    setShopMeta(shopRes.data);
                } else if (list[0]?.shop) {
                    setShopMeta(list[0].shop);
                } else {
                    setShopMeta({ id: shopId, name: shopName });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });

    }, [shopId]);

    // ================= FILTERS =================

    const filteredProducts = useMemo(
        () => filterAndSortProducts(products, {
            searchTerm,
            selectedCategory,
            minPrice,
            maxPrice,
            sortBy
        }),
        [products, searchTerm, selectedCategory, minPrice, maxPrice, sortBy]
    );

    const categories = useMemo(() => collectCategories(products), [products]);

    const handleAddToCart = (product) => {
        if (isProductPurchasable(product)) addToCart(product);
    };

    // ================= REDIRECT SHOP =================

    if (!shopId || Number.isNaN(shopId)) {
        return <Navigate to="/" />;
    }

    // ================= SKELETON =================

    const SkeletonCard = () => (
        <div className="bg-white rounded-3xl overflow-hidden shadow-md animate-pulse">
            <div className="h-64 bg-gray-200"></div>
            <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-4/5"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-12 bg-gray-200 rounded-2xl"></div>
            </div>
        </div>
    );

    const productNavState = { shopName, shopId, fromView: fromShops ? 'shops' : undefined };

    const breadcrumbItems = [
        { label: 'Главная', to: HOME_PATH },
        fromShops
            ? { label: 'Магазины', to: HOME_SHOPS_VIEW }
            : { label: 'Все товары', to: HOME_PATH },
        { label: shopName || 'Каталог' }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12 relative">
            <Breadcrumbs items={breadcrumbItems} />

            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                        {shopName || 'Каталог'}
                    </h1>
                    <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">Букеты магазина</p>
                </div>
                {shopMeta && (
                    <ShopActionButtons
                        shop={{ id: shopId, name: shopMeta.name || shopName, ...shopMeta }}
                    />
                )}
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 mb-8 sm:mb-10">
                <div className="flex flex-col sm:flex-row gap-3 mb-0">
                    <input
                        type="text"
                        placeholder="Поиск букета..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base"
                    />
                    <button
                        type="button"
                        onClick={() => setFiltersOpen(v => !v)}
                        className={`${btnSecondary} px-5 py-2.5 text-sm shrink-0`}
                    >
                        {filtersOpen ? 'Скрыть фильтры' : 'Фильтры'}
                    </button>
                </div>

                {filtersOpen && (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mt-4 pt-4 border-t border-gray-100">

                <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="border border-gray-300 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base"
                >
                    <option value="all">Все категории</option>
                    {categories.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                <input
                    type="number"
                    placeholder="Цена от"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="border border-gray-300 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base"
                />

                <input
                    type="number"
                    placeholder="Цена до"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="border border-gray-300 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base"
                />

                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base"
                >
                    <option value="default">По умолчанию</option>
                    <option value="newest">Сначала новые</option>
                    <option value="price_asc">Цена ↑</option>
                    <option value="price_desc">Цена ↓</option>
                    <option value="name_asc">Название А–Я</option>
                    <option value="name_desc">Название Я–А</option>
                </select>

                </div>
                )}
            </div>

            {/* PRODUCTS */}

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">

                {loading ? (
                    Array(8).fill(0).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))
                ) : filteredProducts.length > 0 ? (
                    filteredProducts.map(product => {
                        const inStock = isProductPurchasable(product);
                        return (
                        <div
                            key={product.id}
                            className={`bg-white rounded-3xl overflow-hidden shadow-md group relative ${
                                !inStock ? 'border border-gray-200' : ''
                            }`}
                        >
                            {!inStock && (
                                <span className="absolute top-4 left-4 z-10 text-xs font-semibold bg-gray-800/80 text-white px-2.5 py-1 rounded-full">
                                    Нет в наличии
                                </span>
                            )}

                            {/* wishlist */}
                            {!isShop && (
                                <button
                                    onClick={() => toggleWishlist(product)}
                                    className="absolute top-4 right-4 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
                                >
                                    {wishlist.some(i => i.id === product.id) ? '❤️' : '♡'}
                                </button>
                            )}

                            <Link
                                to={productPath(product.id, { fromShops })}
                                state={productNavState}
                            >
                                <img
                                    src={productImageUrl(product)}
                                    alt={product.name}
                                    className={`w-full h-64 object-cover bg-gray-100 ${
                                        !inStock ? 'opacity-60 grayscale' : ''
                                    }`}
                                />
                            </Link>

                            <div className="p-6">

                                <h3 className="font-semibold mb-3">
                                    {product.name}
                                </h3>

                                <p className="text-3xl font-bold text-pink-600 mb-6">
                                    {product.price.toLocaleString('ru-RU')} ₽
                                </p>

                                <div className="flex gap-3">
                                    {!isShop && inStock && (
                                        <button
                                            type="button"
                                            onClick={() => handleAddToCart(product)}
                                            className="flex-1 bg-pink-600 text-white py-4 rounded-2xl hover:bg-pink-700"
                                        >
                                            В корзину
                                        </button>
                                    )}
                                    {!isShop && !inStock && (
                                        <Link
                                            to={productPath(product.id, { fromShops })}
                                            state={productNavState}
                                            className="flex-1 bg-gray-100 text-gray-800 text-center py-4 rounded-2xl hover:bg-gray-200 text-sm font-medium"
                                        >
                                            🔔 Уведомить о поступлении
                                        </Link>
                                    )}
                                    {!isShop && (
                                        <Link
                                            to={productPath(product.id, { fromShops })}
                                            state={productNavState}
                                            className="flex-1 border border-gray-300 text-center py-4 rounded-2xl hover:bg-gray-50"
                                        >
                                            Подробнее
                                        </Link>
                                    )}
                                </div>

                            </div>

                        </div>
                    );})
                ) : (
                    <div className="col-span-full text-center py-20">
                        <div className="text-6xl mb-4">🌸</div>
                        <h2 className="text-2xl font-bold">Нет товаров</h2>
                    </div>
                )}

            </div>

        </div>
    );
}

export default Catalog;