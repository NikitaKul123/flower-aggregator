import { useEffect, useState, useContext, useMemo } from 'react';
import { useParams, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import axios from 'axios';

import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { filterAndSortProducts, collectCategories } from '../utils/catalogFilters';
import { API_BASE } from '../config/api';
import { isProductPurchasable } from '../utils/productAvailability';
import { HOME_PATH, HOME_SHOPS_VIEW, isShopsHomeView, productPath } from '../utils/navigationPaths';
import Breadcrumbs from '../components/Breadcrumbs';
import ShopActionButtons from '../components/ShopActionButtons';
import ProductCatalogCard from '../components/ProductCatalogCard';
import CatalogSearchToolbar from '../components/CatalogSearchToolbar';
import { filterFieldClass } from '../components/MobileFilterSheet';

const CATALOG_SORT_OPTIONS = [
    { value: 'default', label: 'По умолчанию' },
    { value: 'newest', label: 'Сначала новые' },
    { value: 'price_asc', label: 'Цена: по возрастанию' },
    { value: 'price_desc', label: 'Цена: по убыванию' },
    { value: 'name_asc', label: 'Название А–Я' },
    { value: 'name_desc', label: 'Название Я–А' }
];

function ProductSkeleton() {
    return (
        <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm animate-pulse">
            <div className="aspect-[4/5] bg-gray-200" />
            <div className="p-3 sm:p-5 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-8 bg-gray-200 rounded-xl w-1/2" />
                <div className="h-10 bg-gray-200 rounded-xl mt-2" />
            </div>
        </div>
    );
}

function CatalogProductFilterFields({
    selectedCategory,
    setSelectedCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    sortBy,
    setSortBy,
    categories
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
                    {CATALOG_SORT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
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
        </div>
    );
}

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
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [shopMeta, setShopMeta] = useState(null);

    useEffect(() => {
        if (shopId && location.state?.shopName) {
            sessionStorage.setItem(`shopName_${shopId}`, location.state.shopName);
        }
    }, [shopId, location.state?.shopName]);

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
    }, [shopId, shopName]);

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

    const activeFiltersCount = useMemo(() => {
        let n = 0;
        if (sortBy !== 'default') n += 1;
        if (selectedCategory !== 'all') n += 1;
        if (minPrice) n += 1;
        if (maxPrice) n += 1;
        return n;
    }, [sortBy, selectedCategory, minPrice, maxPrice]);

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setMinPrice('');
        setMaxPrice('');
        setSortBy('default');
        setMobileFiltersOpen(false);
    };

    const filterFields = (
        <CatalogProductFilterFields
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            sortBy={sortBy}
            setSortBy={setSortBy}
            categories={categories}
        />
    );

    const productNavState = { shopName, shopId, fromView: fromShops ? 'shops' : undefined };

    if (!shopId || Number.isNaN(shopId)) {
        return <Navigate to="/" />;
    }

    const breadcrumbItems = [
        { label: 'Главная', to: HOME_PATH },
        fromShops
            ? { label: 'Магазины', to: HOME_SHOPS_VIEW }
            : { label: 'Все товары', to: HOME_PATH },
        { label: shopName || 'Каталог' }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-10 pb-mobile-nav lg:pb-10">
            <div className="hidden sm:block">
                <Breadcrumbs items={breadcrumbItems} />
            </div>

            <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                        {shopName || 'Каталог'}
                    </h1>
                    <p className="text-gray-500 mt-1 text-xs sm:text-base">
                        {!loading && `${filteredProducts.length} из ${products.length} товаров`}
                    </p>
                </div>
                {shopMeta && (
                    <ShopActionButtons
                        shop={{ id: shopId, name: shopMeta.name || shopName, ...shopMeta }}
                    />
                )}
            </div>

            <CatalogSearchToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Поиск букета…"
                activeFiltersCount={activeFiltersCount}
                mobileFiltersOpen={mobileFiltersOpen}
                onOpenMobileFilters={() => setMobileFiltersOpen(true)}
                onCloseMobileFilters={() => setMobileFiltersOpen(false)}
                filtersOpen={filtersOpen}
                onToggleFilters={() => setFiltersOpen(v => !v)}
                filterFields={filterFields}
                onResetFilters={resetFilters}
                showReset
                applyLabel={`Показать · ${filteredProducts.length}`}
                sortSelect={(
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm min-w-[180px] focus:outline-none focus:border-pink-500"
                    >
                        {CATALOG_SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )}
            />

            <div className="grid grid-cols-2 gap-2.5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loading ? (
                    Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)
                ) : filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                        <ProductCatalogCard
                            key={product.id}
                            product={product}
                            inStock={isProductPurchasable(product)}
                            isShop={isShop}
                            wishlist={wishlist}
                            toggleWishlist={toggleWishlist}
                            addToCart={addToCart}
                            productTo={productPath(product.id, { fromShops })}
                            productLinkState={productNavState}
                            hideShop
                        />
                    ))
                ) : (
                    <div className="col-span-full text-center py-16 sm:py-20">
                        <div className="text-5xl sm:text-6xl mb-4">🌸</div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Ничего не найдено</h2>
                        <p className="text-gray-500 mb-6 text-sm">Попробуйте изменить фильтры</p>
                        <button type="button" onClick={resetFilters} className="text-pink-600 font-semibold text-sm">
                            Сбросить фильтры
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Catalog;
