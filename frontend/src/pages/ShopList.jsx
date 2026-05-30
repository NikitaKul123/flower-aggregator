import { useEffect, useState, useContext, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { mediaUrl } from '../utils/media';
import { productImageUrl } from '../utils/productImage';
import { fetchAllCatalogProducts, fetchShops } from '../api/catalogApi';
import { filterAndSortProducts, collectCategories } from '../utils/catalogFilters';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { btnPrimary, btnSecondary } from '../utils/ui';
import { shopRatingStars } from '../utils/shopRating';
import { isProductPurchasable } from '../utils/productAvailability';
import { catalogPath } from '../utils/navigationPaths';
import Breadcrumbs from '../components/Breadcrumbs';
import ShopActionButtons from '../components/ShopActionButtons';

const SORT_OPTIONS = [
    { value: 'default', label: 'По умолчанию' },
    { value: 'newest', label: 'Сначала новые' },
    { value: 'price_asc', label: 'Цена: по возрастанию' },
    { value: 'price_desc', label: 'Цена: по убыванию' },
    { value: 'name_asc', label: 'Название А–Я' },
    { value: 'name_desc', label: 'Название Я–А' },
    { value: 'shop_asc', label: 'По магазину' }
];

function ProductSkeleton() {
    return (
        <div className="rounded-3xl overflow-hidden bg-white/80 border border-gray-100 shadow-sm animate-pulse">
            <div className="aspect-[4/5] bg-gradient-to-br from-gray-100 to-gray-200" />
            <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded-full w-1/3" />
                <div className="h-6 bg-gray-200 rounded-xl w-4/5" />
                <div className="h-10 bg-gray-200 rounded-2xl w-full mt-2" />
            </div>
        </div>
    );
}

function ShopSkeleton() {
    return (
        <div className="rounded-3xl overflow-hidden bg-white/80 border border-gray-100 shadow-sm animate-pulse">
            <div className="aspect-[16/10] bg-gradient-to-br from-pink-50 to-rose-100" />
            <div className="p-6 space-y-3">
                <div className="h-7 bg-gray-200 rounded-xl w-2/3" />
                <div className="h-4 bg-gray-200 rounded-lg w-full" />
                <div className="h-12 bg-gray-200 rounded-2xl mt-4" />
            </div>
        </div>
    );
}

function ProductCatalogCard({ product, inStock, isShop, wishlist, toggleWishlist, addToCart }) {
    const isWishlisted = wishlist.some(i => i.id === product.id);

    return (
        <article
            className={`group relative flex flex-col rounded-3xl overflow-hidden bg-white border transition-all duration-300 ${
                inStock
                    ? 'border-gray-100/80 shadow-sm hover:shadow-xl hover:shadow-pink-500/10 hover:-translate-y-1'
                    : 'border-gray-200/90 shadow-sm opacity-[0.97]'
            }`}
        >
            <Link to={`/product/${product.id}`} className="block relative aspect-[4/5] overflow-hidden bg-gray-100">
                <img
                    src={productImageUrl(product)}
                    alt={product.name}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${
                        inStock ? 'group-hover:scale-105' : 'scale-100 opacity-55 grayscale'
                    }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pointer-events-none" />

                {product.category && (
                    <span className="absolute top-3 left-3 z-10 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm">
                        {product.category}
                    </span>
                )}

                {!inStock && (
                    <span className="absolute top-3 right-3 z-10 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-900/85 text-white backdrop-blur-sm">
                        Нет в наличии
                    </span>
                )}

                <span className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md text-pink-600 font-bold text-lg shadow-lg">
                    {product.price.toLocaleString('ru-RU')} ₽
                </span>
            </Link>

            {!isShop && (
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
                    className={`absolute bottom-14 right-3 z-20 w-10 h-10 rounded-full backdrop-blur-md shadow-md flex items-center justify-center text-lg transition-transform hover:scale-110 ${
                        isWishlisted ? 'bg-pink-500 text-white' : 'bg-white/90 text-gray-500 hover:text-pink-500'
                    }`}
                    aria-label="В избранное"
                >
                    {isWishlisted ? '❤️' : '♡'}
                </button>
            )}

            <div className="p-4 sm:p-5 flex flex-col flex-1">
                {product.shop && (
                    <Link
                        to={`/catalog/${product.shop.id}`}
                        state={{ shopName: product.shop.name }}
                        className="inline-flex items-center gap-2 mb-3 w-fit group/shop"
                    >
                        {product.shop.avatar ? (
                            <img
                                src={mediaUrl(product.shop.avatar)}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow"
                            />
                        ) : (
                            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                                {product.shop.name?.[0]}
                            </span>
                        )}
                        <span className="text-xs font-medium text-gray-500 group-hover/shop:text-pink-600 truncate max-w-[120px] transition-colors">
                            {product.shop.name}
                        </span>
                        {shopRatingStars(product.shop) && (
                            <span className="text-xs text-amber-500">{shopRatingStars(product.shop)}</span>
                        )}
                    </Link>
                )}

                <Link to={`/product/${product.id}`} className="flex-1">
                    <h2 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-pink-600 transition-colors">
                        {product.name}
                    </h2>
                </Link>

                {!isShop && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                        {inStock ? (
                            <button
                                type="button"
                                onClick={() => addToCart(product)}
                                className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-semibold py-3 rounded-2xl hover:from-pink-700 hover:to-rose-700 shadow-md shadow-pink-500/20 transition active:scale-[0.98]"
                            >
                                В корзину
                            </button>
                        ) : (
                            <Link
                                to={`/product/${product.id}`}
                                className="flex-1 text-center bg-gray-900 text-white text-sm font-semibold py-3 rounded-2xl hover:bg-gray-800 transition"
                            >
                                🔔 Уведомить
                            </Link>
                        )}
                        <Link
                            to={`/product/${product.id}`}
                            className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50 transition"
                            title="Подробнее"
                        >
                            →
                        </Link>
                    </div>
                )}
            </div>
        </article>
    );
}

function ShopCatalogCard({ shop }) {
    return (
        <article className="group relative rounded-3xl overflow-hidden bg-white border border-gray-100/80 shadow-sm hover:shadow-xl hover:shadow-pink-500/10 hover:-translate-y-1 transition-all duration-300">
            <Link
                to={catalogPath(shop.id, { fromShops: true })}
                state={{ shopName: shop.name }}
                className="block relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-orange-50"
            >
                {shop.avatar ? (
                    <img
                        src={mediaUrl(shop.avatar)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Avatar src={null} name={shop.name} size="xl" className="w-28 h-28 text-4xl ring-4 ring-white/50 shadow-xl" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/25 to-transparent" />

                <div className="absolute top-4 right-4 z-20" onClick={(e) => e.preventDefault()}>
                    <ShopActionButtons shop={shop} compact />
                </div>

                {shop.isVerified && (
                    <span className="absolute top-4 left-4 z-10 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/95 text-emerald-700 backdrop-blur-sm">
                        ✓ Проверен
                    </span>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-white">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight drop-shadow-sm group-hover:text-pink-100 transition-colors">
                        {shop.name}
                    </h2>
                    {shop.address && (
                        <p className="text-sm text-white/85 mt-1 line-clamp-1 flex items-center gap-1.5">
                            <span className="opacity-80">📍</span>
                            {shop.address}
                        </p>
                    )}
                </div>
            </Link>

            <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2 text-sm">
                        {shopRatingStars(shop) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold">
                                {shopRatingStars(shop)}
                            </span>
                        ) : (
                            <span className="text-gray-400 text-xs">Новый магазин</span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                        {shop.sameDayDelivery !== false && (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                                Сегодня
                            </span>
                        )}
                        {shop.deliveryTime && (
                            <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                                🚚 {shop.deliveryTime}
                            </span>
                        )}
                    </div>
                </div>
                {(shop.serviceDistricts?.length > 0) && (
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                        Районы: {shop.serviceDistricts.slice(0, 4).join(', ')}
                        {shop.serviceDistricts.length > 4 ? '…' : ''}
                    </p>
                )}

                <Link
                    to={catalogPath(shop.id, { fromShops: true })}
                    state={{ shopName: shop.name }}
                    className={`${btnPrimary} w-full py-3.5 rounded-2xl shadow-md shadow-pink-500/20 group/btn`}
                >
                    <span className="inline-flex items-center justify-center gap-2">
                        Смотреть каталог
                        <span className="transition-transform group-hover/btn:translate-x-0.5">→</span>
                    </span>
                </Link>
            </div>
        </article>
    );
}

function ShopList() {
    const { addToCart, toggleWishlist, wishlist } = useContext(CartContext);
    const { user } = useContext(AuthContext);
    const isShop = user?.role === 'SHOP_ADMIN';

    const [searchParams, setSearchParams] = useSearchParams();
    const view = searchParams.get('view') === 'shops' ? 'shops' : 'products';

    const switchView = (next) => {
        if (next === 'shops') {
            setSearchParams({ view: 'shops' });
        } else {
            setSearchParams({});
        }
    };
    const [shops, setShops] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedShopId, setSelectedShopId] = useState('all');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sortBy, setSortBy] = useState('default');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [districtFilter, setDistrictFilter] = useState('');
    const [sameDayOnly, setSameDayOnly] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');

        Promise.all([fetchAllCatalogProducts(), fetchShops({})])
            .then(([catalog, shopList]) => {
                if (cancelled) return;
                setProducts(catalog);
                setShops(shopList);
            })
            .catch(err => {
                if (cancelled) return;
                console.error(err);
                setError('Не удалось загрузить каталог. Проверьте, что backend запущен.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, []);

    const categories = useMemo(() => collectCategories(products), [products]);

    useEffect(() => {
        if (view !== 'shops') return;
        fetchShops({ district: districtFilter, sameDay: sameDayOnly })
            .then(setShops)
            .catch(console.error);
    }, [view, districtFilter, sameDayOnly]);

    const filteredProducts = useMemo(() => {
        let list = filterAndSortProducts(products, {
            searchTerm,
            selectedCategory,
            selectedShopId,
            minPrice,
            maxPrice,
            sortBy
        });
        if (sameDayOnly) {
            list = list.filter(p => p.shop?.sameDayDelivery !== false);
        }
        if (districtFilter.trim()) {
            const q = districtFilter.trim().toLowerCase();
            list = list.filter(p => {
                const shop = p.shop;
                if (!shop) return false;
                const districts = shop.serviceDistricts || [];
                if (districts.some(d => String(d).toLowerCase().includes(q))) return true;
                return (shop.address || '').toLowerCase().includes(q);
            });
        }
        return list;
    }, [products, searchTerm, selectedCategory, selectedShopId, minPrice, maxPrice, sortBy, sameDayOnly, districtFilter]);

    const sortedShops = useMemo(() => {
        const list = [...shops];
        if (sortBy === 'shop_asc' || sortBy === 'name_asc') {
            list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        } else if (sortBy === 'name_desc') {
            list.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
        } else {
            list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            return list.filter(s =>
                s.name.toLowerCase().includes(q)
                || s.address?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [shops, sortBy, searchTerm]);

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setSelectedShopId('all');
        setMinPrice('');
        setMaxPrice('');
        setSortBy('default');
        setDistrictFilter('');
        setSameDayOnly(false);
    };

    const homeBreadcrumbs =
        view === 'shops'
            ? [{ label: 'Главная', to: '/' }, { label: 'Магазины' }]
            : [{ label: 'Главная', to: '/' }, { label: 'Все товары' }];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <Breadcrumbs items={homeBreadcrumbs} />

            <section className="relative text-center mb-10 sm:mb-12 py-10 sm:py-14 px-4 rounded-[2rem] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-rose-50" />
                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-pink-200/40 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-rose-200/35 blur-3xl" />
                <div className="relative">
                    <p className="inline-flex items-center gap-2 text-pink-600 font-semibold text-xs sm:text-sm uppercase tracking-widest mb-3 px-3 py-1 rounded-full bg-white/70 border border-pink-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        FlowerShop
                    </p>
                    <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-gray-900 mb-3 tracking-tight">
                        Букеты всех магазинов города
                    </h1>
                    <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        Сравнивайте цены, выбирайте магазин или сразу добавляйте понравившийся букет в корзину
                    </p>
                </div>
            </section>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="inline-flex p-1 bg-gray-100 rounded-2xl self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => switchView('products')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                            view === 'products'
                                ? 'bg-white text-pink-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Все товары
                    </button>
                    <button
                        type="button"
                        onClick={() => switchView('shops')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                            view === 'shops'
                                ? 'bg-white text-pink-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Магазины
                    </button>
                </div>

                {!loading && (
                    <p className="text-sm text-gray-500">
                        {view === 'products'
                            ? `${filteredProducts.length} из ${products.length} товаров`
                            : `${sortedShops.length} магазинов`}
                    </p>
                )}
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="search"
                        placeholder={view === 'products' ? 'Поиск букета или магазина...' : 'Поиск магазина...'}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm sm:text-base focus:outline-none focus:border-pink-500"
                    />
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm sm:text-base min-w-[180px] focus:outline-none focus:border-pink-500"
                    >
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => setFiltersOpen(v => !v)}
                        className={`${btnSecondary} px-5 py-2.5 text-sm shrink-0`}
                    >
                        {filtersOpen ? 'Скрыть фильтры' : 'Фильтры'}
                    </button>
                </div>

                {filtersOpen && (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-100">
                        <input
                            type="text"
                            placeholder="Район доставки"
                            value={districtFilter}
                            onChange={e => setDistrictFilter(e.target.value)}
                            className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
                        />
                        <label className="flex items-center gap-2 text-sm px-2 cursor-pointer sm:col-span-2">
                            <input
                                type="checkbox"
                                checked={sameDayOnly}
                                onChange={e => setSameDayOnly(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            Доставка сегодня
                        </label>
                {view === 'products' && (
                    <>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                        >
                            <option value="all">Все категории</option>
                            {categories.filter(c => c !== 'all').map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <select
                            value={selectedShopId}
                            onChange={e => setSelectedShopId(e.target.value)}
                            className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                        >
                            <option value="all">Все магазины</option>
                            {shops.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="0"
                            placeholder="Цена от"
                            value={minPrice}
                            onChange={e => setMinPrice(e.target.value)}
                            className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                        />
                        <input
                            type="number"
                            min="0"
                            placeholder="Цена до"
                            value={maxPrice}
                            onChange={e => setMaxPrice(e.target.value)}
                            className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                        />
                    </>
                )}
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-sm text-pink-600 hover:text-pink-700 font-medium sm:col-span-2 lg:col-span-4 text-left"
                        >
                            Сбросить фильтры
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                    {Array(8).fill(0).map((_, i) => (
                        view === 'products' ? <ProductSkeleton key={i} /> : <ShopSkeleton key={i} />
                    ))}
                </div>
            ) : view === 'products' ? (
                filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                        {filteredProducts.map(product => (
                            <ProductCatalogCard
                                key={product.id}
                                product={product}
                                inStock={isProductPurchasable(product)}
                                isShop={isShop}
                                wishlist={wishlist}
                                toggleWishlist={toggleWishlist}
                                addToCart={addToCart}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🌸</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Ничего не найдено</h2>
                        <p className="text-gray-500 mb-6">Попробуйте изменить фильтры или поиск</p>
                        <button type="button" onClick={resetFilters} className={btnPrimary + ' px-6 py-3'}>
                            Сбросить фильтры
                        </button>
                    </div>
                )
            ) : sortedShops.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                    {sortedShops.map(shop => (
                        <ShopCatalogCard key={shop.id} shop={shop} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500">Магазины не найдены</div>
            )}
        </div>
    );
}

export default ShopList;
