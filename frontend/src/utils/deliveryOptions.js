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

export const DEFAULT_DELIVERY_SLOTS = [
    { id: '10-14', label: '10:00 – 14:00' },
    { id: '14-18', label: '14:00 – 18:00' },
    { id: '18-21', label: '18:00 – 21:00' }
];
