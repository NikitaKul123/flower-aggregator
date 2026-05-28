/** Покупатель (не магазин, не курьер, не админ). */
export function isCustomerUser(user) {
    return user?.role === 'CUSTOMER';
}

export function isSuperAdminUser(user) {
    return user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
}
