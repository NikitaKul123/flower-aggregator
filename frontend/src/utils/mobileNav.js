import { isSuperAdminUser } from './roles';

const AUTH_ROUTES_NO_NAV = new Set([
    '/login',
    '/register',
    '/shop/login',
    '/shop/register',
    '/courier/login',
    '/super-admin/login',
]);

const HIDE_BOTTOM_NAV = [
    /\/chat$/,
    /^\/checkout$/,
    /^\/success$/,
    /^\/super-admin/,
];

export function shouldShowMobileBottomNav(pathname, user) {
    if (HIDE_BOTTOM_NAV.some((re) => re.test(pathname))) return false;
    if (AUTH_ROUTES_NO_NAV.has(pathname)) return false;
    if (user && isSuperAdminUser(user)) return false;
    return true;
}

/** @returns {'guest'|'customer'|'shop'|'courier'|'none'} */
export function getMobileNavMode(user) {
    if (!user) return 'guest';
    if (isSuperAdminUser(user)) return 'none';
    if (user.role === 'SHOP_ADMIN') return 'shop';
    if (user.role === 'COURIER') return 'courier';
    return 'customer';
}

export function isActiveNavPath(pathname, to) {
    if (to === '/') return pathname === '/';
    return pathname === to || pathname.startsWith(`${to}/`);
}
