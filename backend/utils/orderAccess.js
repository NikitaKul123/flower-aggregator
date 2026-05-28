/** Проверка доступа к заказу: клиент, магазин, курьер */
export function canAccessOrder(order, user, shopId) {
    if (!order || !user) return false;

    if (user.role === 'SHOP_ADMIN') {
        const sid = shopId ?? user.shopId;
        if (!sid) return false;
        return Number(sid) === Number(order.shopId);
    }

    if (user.role === 'COURIER') {
        const sid = shopId ?? user.shopId;
        if (!sid || Number(sid) !== Number(order.shopId)) return false;
        return Number(order.courierId) === Number(user.userId);
    }

    return Number(user.userId) === Number(order.userId);
}

export function canReadOrderChat(order, user, shopId) {
    if (!order || !user) return false;
    if (user.role === 'SHOP_ADMIN') {
        const sid = shopId ?? user.shopId;
        return sid && Number(sid) === Number(order.shopId);
    }
    if (user.role === 'COURIER') {
        return canAccessOrder(order, user, shopId);
    }
    return Number(user.userId) === Number(order.userId);
}

export async function getOrderIfAllowed(prisma, orderId, req, select) {
    const order = await prisma.order.findUnique({
        where: { id: Number(orderId) },
        ...(select ? { select } : {})
    });
    if (!order) return null;

    const shopId = req.shopId ?? req.user?.shopId;
    if (!canReadOrderChat(order, req.user, shopId)) return null;
    return order;
}
