export const ORDER_STATUS_LABELS = {
    PENDING: 'Новый',
    CONFIRMED: 'Подтверждён',
    ASSEMBLING: 'Собирается',
    READY: 'Готов',
    DELIVERING: 'В доставке',
    DELIVERED: 'Доставлен',
    NO_CONTACT: 'Не дозвонился',
    CANCELLED: 'Отменён'
};

export function orderStatusLabel(status) {
    return ORDER_STATUS_LABELS[status] || status;
}
