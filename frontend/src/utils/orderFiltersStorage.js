const SHOP_KEY = 'shop_orders_filters';
const CUSTOMER_KEY = 'customer_orders_filters';

export const defaultShopFilters = {
    search: '',
    status: 'ALL',
    dateFrom: '',
    dateTo: '',
    minTotal: '',
    maxTotal: '',
    onlyUnread: false
};

export const defaultCustomerFilters = {
    search: '',
    status: 'ALL',
    dateFrom: '',
    dateTo: '',
    minTotal: '',
    maxTotal: '',
    onlyUnread: false
};

export function loadFilters(key, defaults) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    } catch {
        return { ...defaults };
    }
}

export function saveFilters(key, filters) {
    localStorage.setItem(key, JSON.stringify(filters));
}

export function filtersToQuery(filters) {
    const q = new URLSearchParams();
    if (filters.search?.trim()) q.set('search', filters.search.trim());
    if (filters.status && filters.status !== 'ALL') q.set('status', filters.status);
    if (filters.dateFrom) q.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) q.set('dateTo', filters.dateTo);
    if (filters.minTotal) q.set('minTotal', filters.minTotal);
    if (filters.maxTotal) q.set('maxTotal', filters.maxTotal);
    if (filters.onlyUnread) q.set('onlyUnread', 'true');
    return q.toString();
}

export { SHOP_KEY, CUSTOMER_KEY };
