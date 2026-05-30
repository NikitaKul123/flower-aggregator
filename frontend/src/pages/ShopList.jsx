import { useEffect, useState, useContext, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchAllCatalogProducts, fetchShops } from '../api/catalogApi';
import { filterAndSortProducts, collectCategories } from '../utils/catalogFilters';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { btnPrimary, btnSecondary } from '../utils/ui';
import { isProductPurchasable } from '../utils/productAvailability';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductCatalogCard from '../components/ProductCatalogCard';
import ShopCatalogCard from '../components/ShopCatalogCard';
import MobileFilterSheet, { FilterSlidersIcon, filterFieldClass } from '../components/MobileFilterSheet';

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

            <MobileFilterSheet
                open={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
                onReset={resetFilters}
                showReset={activeFiltersCount > 0}
                applyLabel={`Показать${view === 'products'
                    ? ` · ${filteredProducts.length}`
                    : ` · ${sortedShops.length}`}`}
            >
                <CatalogFilterFields {...filterFieldsProps} />
            </MobileFilterSheet>

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
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                <div className="grid grid-cols-2 gap-2.5 sm:gap-6 lg:grid-cols-3">
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
