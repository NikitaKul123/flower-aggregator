/** Относительный путь для клика по push (SPA + highlight заказов) */
export function resolvePushLink({ link, orderId, type, groupKey, shopId }) {
    const oid = orderId != null ? Number(orderId) : null;
    const generic = ['/orders', '/shop/orders', '/courier/orders', '/notifications'];

    if (link && !generic.includes(link)) {
        return link.startsWith('/') ? link : `/${link}`;
    }

    if (oid && type === 'CHAT') {
        if (link?.includes('/chat')) return link;
        if (groupKey?.startsWith('chat-shop-courier-')) {
            return `/shop/orders/${oid}/chat?channel=shop-courier`;
        }
        if (groupKey?.startsWith('chat-courier-')) {
            return `/orders/${oid}/chat?channel=courier`;
        }
        if (shopId) return `/shop/orders/${oid}/chat`;
        return `/orders/${oid}/chat`;
    }

    if (oid && type === 'STATUS') {
        if (shopId || link?.startsWith('/shop')) return `/shop/orders?highlight=${oid}`;
        if (link === '/courier/orders') return `/courier/orders?highlight=${oid}`;
        return `/orders?highlight=${oid}`;
    }

    if (oid && type === 'ORDER') {
        if (shopId) return `/shop/orders?highlight=${oid}`;
        if (link === '/courier/orders') return `/courier/orders?highlight=${oid}`;
    }

    return link || '/notifications';
}

/** Текст push для сообщения в чате */
export function formatChatPushBody(text, imageUrl, fallback = 'Новое сообщение') {
    if (text?.trim()) {
        const t = text.trim();
        return t.length > 200 ? `${t.slice(0, 197)}…` : t;
    }
    if (imageUrl) return '📷 Фото';
    return fallback;
}
