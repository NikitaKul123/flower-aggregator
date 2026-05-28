/** Дата YYYY-MM-DD без сдвига по часовому поясу */
export function formatDeliveryDate(value) {
    if (!value) return null;
    const part = String(value).slice(0, 10);
    const [y, m, d] = part.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}

export function formatDeliveryDateShort(value) {
    if (!value) return null;
    const part = String(value).slice(0, 10);
    const [y, m, d] = part.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
    });
}

/** Сводка по доставке для карточки заказа */
export function getOrderDeliverySummary(order) {
    if (!order) return null;

    if (order.isPickup) {
        return {
            mode: 'pickup',
            title: 'Самовывоз',
            shortLabel: 'Самовывоз',
            lines: [{ icon: '🏪', text: 'Клиент заберёт заказ в магазине' }]
        };
    }

    const di = order.deliveryInfo || {};
    const dateLabel = formatDeliveryDate(di.deliveryDate);
    const dateShort = formatDeliveryDateShort(di.deliveryDate);
    const slot = di.deliverySlotLabel || di.deliverySlotId || null;

    const scheduleParts = [];
    if (dateShort) scheduleParts.push(dateShort);
    if (slot) scheduleParts.push(slot);

    const lines = [];
    if (dateLabel || slot) {
        lines.push({
            icon: '📅',
            text: [dateLabel, slot].filter(Boolean).join(' · '),
            highlight: true
        });
    }
    if (di.name) lines.push({ icon: '👤', text: di.name });
    if (di.phone) lines.push({ icon: '📞', text: di.phone });
    if (di.address) lines.push({ icon: '📍', text: di.address });
    if (di.comment) lines.push({ icon: '💬', text: di.comment });
    if (di.giftCardMessage) {
        lines.push({ icon: '💌', text: `Открытка: «${di.giftCardMessage}»`, gift: true });
    }

    return {
        mode: 'delivery',
        title: dateLabel || slot ? 'Доставка' : 'Контакты',
        shortLabel: scheduleParts.length ? scheduleParts.join(' · ') : null,
        dateLabel,
        slot,
        lines,
        raw: di
    };
}
