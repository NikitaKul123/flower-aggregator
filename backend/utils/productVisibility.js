/** Товары на витрине: активные, включая «нет в наличии» */
export function catalogWhere(extra = {}) {
    return {
        ...extra,
        status: 'ACTIVE',
        isTemplate: false
    };
}

export function syncProductFlags(data) {
    const next = { ...data };
    if (next.status === 'ACTIVE') {
        next.isActive = true;
    } else if (next.status === 'DRAFT' || next.status === 'HIDDEN') {
        next.isActive = false;
    }
    return next;
}

export function isPurchasable(product) {
    if (!product || product.status !== 'ACTIVE' || product.isOutOfStock) return false;
    if (product.stock != null && product.stock <= 0) return false;
    return product.isActive !== false;
}

export function attachAvailability(product) {
    if (!product) return product;
    return { ...product, available: isPurchasable(product) };
}
