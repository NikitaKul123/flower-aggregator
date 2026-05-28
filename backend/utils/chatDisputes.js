const REPLY_SLA_MS = 2 * 60 * 60 * 1000;

export function messageSenderSide(msg) {
    if (!msg) return null;
    if (msg.isFromCourier) return 'courier';
    if (msg.isFromShop) return 'shop';
    return 'customer';
}

export function needsReply(lastMsg, expectedResponder) {
    if (!lastMsg) return false;
    const side = messageSenderSide(lastMsg);
    if (side === expectedResponder) return false;
    if (side !== 'customer') return false;
    return Date.now() - new Date(lastMsg.createdAt).getTime() > REPLY_SLA_MS;
}

export function buildLastByChannel(messages) {
    const map = new Map();
    for (const m of messages) {
        const key = `${m.orderId}:${m.channel}`;
        if (!map.has(key)) map.set(key, m);
    }
    return map;
}

export function previewText(msg) {
    if (!msg) return 'Нет сообщений';
    if (msg.text) return msg.text;
    if (msg.imageUrl) return '📷 Фото';
    return 'Сообщение';
}
