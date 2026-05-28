/** Активный канал чата (из ChatBox), точнее чем только URL */
let activeChat = null;

export function setActiveChatChannel(detail) {
    activeChat = detail || null;
}

export function clearActiveChatChannel() {
    activeChat = null;
}

/** @param {boolean|'shop'|'customer'|'courier'} actor */
export function isInChatForOrder(location, orderId, actor, { messageChannel } = {}) {
    const id = String(orderId);
    const normalizedActor = actor === true ? 'shop' : actor;

    if (activeChat && String(activeChat.orderId) === id && activeChat.actor === normalizedActor) {
        if (!messageChannel) return true;
        return activeChat.channel === messageChannel;
    }

    const params = new URLSearchParams(location.search || '');
    if (normalizedActor === 'courier') {
        if (location.pathname !== `/courier/orders/${id}/chat`) return false;
        if (!messageChannel) return false;
        if (messageChannel === 'SHOP_COURIER') return params.get('tab') === 'shop';
        if (messageChannel === 'COURIER') return params.get('tab') !== 'shop';
        return false;
    }
    if (normalizedActor === 'shop') {
        if (location.pathname !== `/shop/orders/${id}/chat`) return false;
        if (!messageChannel) return false;
        if (messageChannel === 'SHOP_COURIER') {
            return params.get('channel') === 'shop-courier';
        }
        if (messageChannel === 'SHOP') {
            return params.get('channel') !== 'shop-courier';
        }
        return false;
    }
    if (location.pathname !== `/orders/${id}/chat`) return false;
    if (!messageChannel) return false;
    if (messageChannel === 'COURIER') {
        return params.get('channel') === 'courier';
    }
    if (messageChannel === 'SHOP') {
        return params.get('channel') !== 'courier';
    }
    return false;
}

export function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch {
        // ignore
    }
}

export function dispatchNotificationsUpdated(payload) {
    let detail;
    if (typeof payload === 'number') {
        detail = { count: payload };
    } else if (payload && typeof payload === 'object') {
        detail = payload;
    }
    window.dispatchEvent(new CustomEvent('notifications-updated', { detail }));
}

export function dispatchOrdersUpdated() {
    window.dispatchEvent(new Event('orders-updated'));
}
