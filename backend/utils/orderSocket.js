import { getIo } from '../socket/io.js';

/** Уведомить клиента и магазин об изменении статуса заказа */
export function emitOrderStatusUpdated({ shopId, userId, orderId, status, unreadCounts }) {
    const io = getIo();
    if (!io) return;

    if (userId) {
        io.to(`customer_${userId}`).emit('status_updated', {
            orderId,
            status,
            unreadCounts
        });
    }

    if (shopId) {
        io.to(`shop_${shopId}`).emit('order_status_updated', { orderId, status });
    }
}
