/** Ссылка из уведомления с подсветкой заказа на странице «Мои заказы» */
export function notificationTargetLink(notif, { isCourier, isShop } = {}) {
    if (isCourier) {
        if (notif.groupKey?.startsWith('chat-shop-courier-') && notif.orderId) {
            return `/courier/orders/${notif.orderId}/chat?tab=shop`;
        }
        if (notif.link?.includes('tab=shop') && notif.orderId) {
            return notif.link;
        }
        if (notif.type === 'CHAT' && notif.orderId) {
            return `/courier/orders/${notif.orderId}/chat`;
        }
        if (notif.orderId && (notif.type === 'ORDER' || notif.link === '/courier/orders')) {
            return `/courier/orders?highlight=${notif.orderId}`;
        }
        return notif.link || '/courier/orders';
    }
    if (isShop) {
        if (notif.groupKey?.startsWith('chat-shop-courier-') && notif.orderId) {
            return `/shop/orders/${notif.orderId}/chat?channel=shop-courier`;
        }
        if (notif.link?.includes('channel=shop-courier') && notif.orderId) {
            return notif.link;
        }
        if (notif.orderId && (notif.type === 'STATUS' || notif.groupKey?.startsWith('status-'))) {
            return `/shop/orders?highlight=${notif.orderId}`;
        }
    }
    if (
        notif.orderId
        && (
            notif.groupKey?.startsWith('chat-courier-')
            || notif.link?.includes('channel=courier')
            || (notif.type === 'CHAT' && notif.message?.toLowerCase().includes('курьер'))
        )
    ) {
        return `/orders/${notif.orderId}/chat?channel=courier`;
    }
    if (notif.type === 'STOCK' && notif.link) {
        return notif.link;
    }
    if (notif.orderId && (notif.type === 'STATUS' || notif.link === '/orders')) {
        return `/orders?highlight=${notif.orderId}`;
    }
    return notif.link || '/notifications';
}
