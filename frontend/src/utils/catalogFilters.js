/**
 * Фильтрация и сортировка товаров (каталог магазина и главная).
 */
export function filterAndSortProducts(products, {
    searchTerm = '',
    selectedCategory = 'all',
    selectedShopId = 'all',
    minPrice = '',
    maxPrice = '',
    sortBy = 'default'
} = {}) {
    let result = [...products];

    if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        result = result.filter(p =>
            p.name.toLowerCase().includes(q)
            || p.shop?.name?.toLowerCase().includes(q)
        );
    }

    if (selectedCategory !== 'all') {
        result = result.filter(p => p.category === selectedCategory);
    }

    if (selectedShopId !== 'all') {
        const sid = Number(selectedShopId);
        result = result.filter(p => Number(p.shopId ?? p.shop?.id) === sid);
    }

    if (minPrice !== '' && minPrice != null) {
        result = result.filter(p => p.price >= Number(minPrice));
    }

    if (maxPrice !== '' && maxPrice != null) {
        result = result.filter(p => p.price <= Number(maxPrice));
    }

    switch (sortBy) {
        case 'price_asc':
            result.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            result.sort((a, b) => b.price - a.price);
            break;
        case 'name_asc':
            result.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
            break;
        case 'name_desc':
            result.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
            break;
        case 'shop_asc':
            result.sort((a, b) =>
                (a.shop?.name || '').localeCompare(b.shop?.name || '', 'ru')
            );
            break;
        case 'newest':
            result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        default:
            break;
    }

    return result;
}

export function collectCategories(products) {
    return ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
}
