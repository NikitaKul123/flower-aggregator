import { useEffect, useState, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

const filterFieldClass =
    'w-full rounded-xl bg-gray-50 border-0 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/25';

function FilterSlidersIcon({ className = 'w-5 h-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 6h16M4 12h10M4 18h6" strokeLinecap="round" />
            <circle cx="17" cy="6" r="2" fill="currentColor" stroke="none" />
            <circle cx="13" cy="12" r="2" fill="currentColor" stroke="none" />
            <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none" />
        </svg>
    );
}

function CatalogFilterFields({
    view,
    sortBy,
    setSortBy,
    districtFilter,
    setDistrictFilter,
    sameDayOnly,
    setSameDayOnly,
    selectedCategory,
    setSelectedCategory,
    selectedShopId,
    setSelectedShopId,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    categories,
    shops
}) {
    return (
        <div className="space-y-4">
            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Сортировка
                </label>
                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className={filterFieldClass}
                >
                    {SORT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Район доставки
                </label>
                <input
                    type="text"
                    placeholder="Например, Центр"
                    value={districtFilter}
                    onChange={e => setDistrictFilter(e.target.value)}
                    className={filterFieldClass}
                />
            </div>

            <label className="flex items-center gap-3 min-h-[48px] px-1 cursor-pointer">
                <input
                    type="checkbox"
                    checked={sameDayOnly}
                    onChange={e => setSameDayOnly(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-pink-600"
                />
                <span className="text-sm text-gray-800">Доставка сегодня</span>
            </label>

            {view === 'products' && (
                <>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                            Категория
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className={filterFieldClass}
                        >
                            <option value="all">Все категории</option>
                            {categories.filter(c => c !== 'all').map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                            Магазин
                        </label>
                        <select
                            value={selectedShopId}
                            onChange={e => setSelectedShopId(e.target.value)}
                            className={filterFieldClass}
                        >
                            <option value="all">Все магазины</option>
                            {shops.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                                Цена от
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={minPrice}
                                onChange={e => setMinPrice(e.target.value)}
                                className={filterFieldClass}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                                Цена до
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="∞"
                                value={maxPrice}
                                onChange={e => setMaxPrice(e.target.value)}
                                className={filterFieldClass}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
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
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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

    const activeFiltersCount = useMemo(() => {
        let n = 0;
        if (sortBy !== 'default') n += 1;
        if (districtFilter.trim()) n += 1;
        if (sameDayOnly) n += 1;
        if (view === 'products') {
            if (selectedCategory !== 'all') n += 1;
            if (selectedShopId !== 'all') n += 1;
            if (minPrice) n += 1;
            if (maxPrice) n += 1;
        }
        return n;
    }, [
        sortBy,
        districtFilter,
        sameDayOnly,
        view,
        selectedCategory,
        selectedShopId,
        minPrice,
        maxPrice
    ]);

    const resultCountLabel = !loading
        ? (view === 'products'
            ? `${filteredProducts.length} из ${products.length}`
            : `${sortedShops.length}`)
        : '';

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setSelectedShopId('all');
        setMinPrice('');
        setMaxPrice('');
        setSortBy('default');
        setDistrictFilter('');
        setSameDayOnly(false);
        setMobileFiltersOpen(false);
    };

    useEffect(() => {
        setMobileFiltersOpen(false);
    }, [view]);

    useEffect(() => {
        if (!mobileFiltersOpen) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [mobileFiltersOpen]);

    const filterFieldsProps = {
        view,
        sortBy,
        setSortBy,
        districtFilter,
        setDistrictFilter,
        sameDayOnly,
        setSameDayOnly,
        selectedCategory,
        setSelectedCategory,
        selectedShopId,
        setSelectedShopId,
        minPrice,
        setMinPrice,
        maxPrice,
        setMaxPrice,
        categories,
        shops
    };

    const homeBreadcrumbs =
        view === 'shops'
            ? [{ label: 'Главная', to: '/' }, { label: 'Магазины' }]
            : [{ label: 'Главная', to: '/' }, { label: 'Все товары' }];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-10">
            <div className="hidden sm:block">
                <Breadcrumbs items={homeBreadcrumbs} />
            </div>

            <section className="hidden sm:block mb-12 relative text-center py-14 px-4 rounded-[2rem] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-rose-50" />
                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-pink-200/40 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-rose-200/35 blur-3xl" />
                <div className="relative">
                    <p className="inline-flex items-center gap-2 text-pink-600 font-semibold text-sm uppercase tracking-widest mb-3 px-3 py-1 rounded-full bg-white/70 border border-pink-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        FlowerShop
                    </p>
                    <h1 className="text-4xl md:text-[2.75rem] font-bold text-gray-900 mb-3 tracking-tight">
                        Букеты всех магазинов города
                    </h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
                        Сравнивайте цены, выбирайте магазин или сразу добавляйте понравившийся букет в корзину
                    </p>
                </div>
            </section>

            {/* ——— Мобилка: компактная шапка каталога ——— */}
            <div className="sm:hidden mb-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-lg font-bold text-gray-900">Букеты города</h1>
                    {resultCountLabel && (
                        <span className="text-xs text-gray-500 tabular-nums shrink-0">
                            {view === 'products' ? `${resultCountLabel} тов.` : `${resultCountLabel} маг.`}
                        </span>
                    )}
                </div>

                <div className="flex p-0.5 bg-gray-100 rounded-xl">
                    <button
                        type="button"
                        onClick={() => switchView('products')}
                        className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition ${
                            view === 'products'
                                ? 'bg-white text-pink-700 shadow-sm'
                                : 'text-gray-600'
                        }`}
                    >
                        Товары
                    </button>
                    <button
                        type="button"
                        onClick={() => switchView('shops')}
                        className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition ${
                            view === 'shops'
                                ? 'bg-white text-pink-700 shadow-sm'
                                : 'text-gray-600'
                        }`}
                    >
                        Магазины
                    </button>
                </div>

                <div className="flex gap-2 items-center">
                    <div className="relative flex-1 min-w-0">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden>
                            🔍
                        </span>
                        <input
                            type="search"
                            placeholder={view === 'products' ? 'Поиск букета…' : 'Поиск магазина…'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl bg-gray-100 border-0 pl-10 pr-4 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileFiltersOpen(true)}
                        className={`relative shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl transition ${
                            activeFiltersCount > 0
                                ? 'bg-pink-50 text-pink-600 ring-1 ring-pink-200'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                        aria-label="Фильтры и сортировка"
                    >
                        <FilterSlidersIcon />
                        {activeFiltersCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-600 text-white text-[10px] font-bold flex items-center justify-center">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ——— Десктоп: вкладки и счётчик ——— */}
            <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="inline-flex p-1 bg-gray-100 rounded-2xl">
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

                {resultCountLabel && (
                    <p className="text-sm text-gray-500">
                        {view === 'products'
                            ? `${resultCountLabel} товаров`
                            : `${resultCountLabel} магазинов`}
                    </p>
                )}
            </div>

            {/* ——— Десктоп: поиск и фильтры ——— */}
            <div className="hidden sm:block bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="flex flex-row gap-3">
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
                        className={`${btnSecondary} px-5 py-2.5 text-sm shrink-0 relative`}
                    >
                        {filtersOpen ? 'Скрыть' : 'Фильтры'}
                        {activeFiltersCount > 0 && (
                            <span className="ml-1.5 inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-pink-600 text-white text-[10px] items-center justify-center">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                </div>

                {filtersOpen && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <CatalogFilterFields {...filterFieldsProps} />
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="mt-4 text-sm text-pink-600 hover:text-pink-700 font-medium"
                        >
                            Сбросить фильтры
                        </button>
                    </div>
                )}
            </div>

            {mobileFiltersOpen && createPortal(
                <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Фильтры">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        aria-label="Закрыть"
                        onClick={() => setMobileFiltersOpen(false)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[88dvh] flex flex-col animate-[mobile-sheet-up_0.25s_ease-out]">
                        <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Фильтры</h2>
                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpen(false)}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
                                aria-label="Закрыть"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            <CatalogFilterFields {...filterFieldsProps} />
                        </div>
                        <div className="shrink-0 p-4 pt-2 border-t border-gray-100 flex flex-col gap-2 safe-area-bottom">
                            {activeFiltersCount > 0 && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="w-full py-3 text-sm font-medium text-pink-600"
                                >
                                    Сбросить всё
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpen(false)}
                                className={`${btnPrimary} w-full py-3.5 rounded-2xl text-base`}
                            >
                                Показать{view === 'products'
                                    ? ` · ${filteredProducts.length}`
                                    : ` · ${sortedShops.length}`}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

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
