/** Текст рейтинга магазина для карточек (без хардкода 4.5) */
export function formatShopRating(shop) {
    if (!shop) return null;
    const count = shop.reviewCount ?? 0;
    if (shop.rating == null || count === 0) return null;
    const label = Number(shop.rating).toFixed(1);
    return count > 0 ? `${label} (${count})` : label;
}

export function shopRatingStars(shop) {
    const formatted = formatShopRating(shop);
    return formatted ? `★ ${formatted}` : null;
}
