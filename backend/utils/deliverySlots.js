export const DEFAULT_DELIVERY_SLOTS = [
    { id: '10-14', label: '10:00 – 14:00' },
    { id: '14-18', label: '14:00 – 18:00' },
    { id: '18-21', label: '18:00 – 21:00' }
];

export function getShopDeliverySlots(shop) {
    const raw = shop?.deliverySlots;
    if (Array.isArray(raw) && raw.length > 0) {
        return raw.filter(s => s?.id && s?.label);
    }
    return DEFAULT_DELIVERY_SLOTS;
}

export function buildDeliveryDateOptions(maxDays = 7) {
    const days = Math.min(Math.max(Number(maxDays) || 7, 1), 14);
    const options = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const value = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'long'
        });
        options.push({ value, label, isToday: i === 0 });
    }
    return options;
}

export function validateDeliveryChoice(shop, deliveryDate, deliverySlotId, isPickup) {
    if (isPickup) return null;
    if (!deliveryDate || !deliverySlotId) {
        return 'Выберите дату и интервал доставки';
    }
    const options = buildDeliveryDateOptions(shop?.maxDeliveryDays ?? 7);
    if (!options.some(o => o.value === deliveryDate)) {
        return 'Недоступная дата доставки';
    }
    const slots = getShopDeliverySlots(shop);
    if (!slots.some(s => s.id === deliverySlotId)) {
        return 'Недоступный интервал доставки';
    }
    const chosen = options.find(o => o.value === deliveryDate);
    if (chosen?.isToday && shop?.sameDayDelivery === false) {
        return 'Этот магазин не доставляет сегодня';
    }
    return null;
}

export function slotLabelById(shop, slotId) {
    return getShopDeliverySlots(shop).find(s => s.id === slotId)?.label || slotId;
}
