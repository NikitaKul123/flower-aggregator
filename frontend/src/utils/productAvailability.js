/** Можно положить в корзину и оформить заказ */
export function isProductPurchasable(product) {
    if (!product) return false;
    if (product.available === false) return false;
    if (product.status && product.status !== 'ACTIVE') return false;
    if (product.isOutOfStock) return false;
    if (product.stock != null && product.stock <= 0) return false;
    return true;
}
