/** Канал в query/body API (без подчёркиваний в URL) */
export function channelQueryValue(channel) {
    if (channel === 'SHOP_COURIER') return 'shop-courier';
    if (channel === 'COURIER') return 'courier';
    return 'shop';
}

export function channelQueryString(channel) {
    return `channel=${encodeURIComponent(channelQueryValue(channel))}`;
}
