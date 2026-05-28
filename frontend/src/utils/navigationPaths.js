export const HOME_PATH = '/';
export const HOME_SHOPS_VIEW = '/?view=shops';

export function isShopsHomeView(searchParams) {
    return searchParams?.get('view') === 'shops';
}

export function catalogPath(shopId, { fromShops = false } = {}) {
    return fromShops ? `/catalog/${shopId}?from=shops` : `/catalog/${shopId}`;
}

export function productPath(productId, { fromShops = false } = {}) {
    return fromShops ? `/product/${productId}?from=shops` : `/product/${productId}`;
}
