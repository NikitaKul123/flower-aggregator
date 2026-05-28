import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireCustomer } from '../middleware/auth.js';
import { buildOrderWhere, matchesSearch } from '../utils/orderFilters.js';
import {
    getUnreadCounts,
    markStatusNotificationsReadForOrder
} from '../services/notificationService.js';
import { isPurchasable } from '../utils/productVisibility.js';

const router = Router();
const prisma = new PrismaClient();

async function attachUnreadCounts(orders) {
    const orderIds = orders.map(o => o.id);
    if (!orderIds.length) return orders.map(o => ({ ...o, unreadMessageCount: 0 }));

    const unread = await prisma.message.groupBy({
        by: ['orderId'],
        where: {
            orderId: { in: orderIds },
            channel: 'SHOP',
            isRead: false,
            isFromShop: true
        },
        _count: { _all: true }
    });

    const map = new Map(unread.map(x => [x.orderId, x._count._all]));
    return orders.map(o => ({
        ...o,
        unreadMessageCount: map.get(o.id) || 0
    }));
}

async function attachReviewFlags(orders, userId) {
    const orderIds = orders.map(o => o.id);
    if (!orderIds.length) {
        return orders.map(o => ({ ...o, review: null, canReview: false }));
    }

    const reviews = await prisma.orderReview.findMany({
        where: { orderId: { in: orderIds } },
        select: {
            id: true,
            orderId: true,
            rating: true,
            text: true,
            shopReply: true,
            shopReplyAt: true,
            createdAt: true
        }
    });
    const map = new Map(reviews.map(r => [r.orderId, r]));

    return orders.map(o => {
        const review = map.get(o.id) || null;
        const canReview = o.status === 'DELIVERED' && !review;
        return { ...o, review, canReview };
    });
}

async function attachUnreadStatusFlags(orders, userId) {
    const orderIds = orders.map(o => o.id);
    if (!orderIds.length) {
        return orders.map(o => ({ ...o, unreadStatusUpdate: false }));
    }

    const unread = await prisma.notification.findMany({
        where: {
            userId: Number(userId),
            type: 'STATUS',
            readAt: null,
            orderId: { in: orderIds }
        },
        select: { orderId: true }
    });

    const set = new Set(unread.map(n => n.orderId));
    return orders.map(o => ({
        ...o,
        unreadStatusUpdate: set.has(o.id)
    }));
}

router.use(authenticateToken, requireCustomer);

router.get('/unread-count', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const counts = await getUnreadCounts({ userId });
        res.json(counts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.get('/', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const where = buildOrderWhere(req.query, { userId });

        let orders = await prisma.order.findMany({
            where,
            include: {
                shop: true,
                courier: { select: { id: true, name: true, phone: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        orders = await attachUnreadCounts(orders);
        orders = await attachUnreadStatusFlags(orders, userId);
        orders = await attachReviewFlags(orders, userId);

        if (req.query.search) {
            orders = orders.filter(o => matchesSearch(o, req.query.search, false));
        }

        if (req.query.onlyUnread === 'true') {
            orders = orders.filter(o => Number(o.unreadMessageCount) > 0 || o.unreadStatusUpdate);
        }

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.put('/:id/ack-status', async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const userId = Number(req.user.userId);

        const order = await prisma.order.findFirst({
            where: { id: orderId, userId }
        });
        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const marked = await markStatusNotificationsReadForOrder(orderId, { userId });
        const counts = await getUnreadCounts({ userId });

        res.json({ success: true, marked, ...counts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.get('/:id/reorder', async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const userId = Number(req.user.userId);

        const order = await prisma.order.findFirst({
            where: { id: orderId, userId },
            include: { shop: { select: { id: true, name: true } } }
        });
        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const rawItems = Array.isArray(order.items) ? order.items : [];
        const items = [];
        const skipped = [];

        for (const line of rawItems) {
            const productId = Number(line.id);
            const qty = Number(line.quantity) || 1;
            const product = await prisma.product.findUnique({ where: { id: productId } });

            if (!product || product.shopId !== order.shopId || !isPurchasable(product)) {
                skipped.push(line.name || `Товар #${productId}`);
                continue;
            }
            if (product.stock != null && product.stock < qty) {
                skipped.push(`${line.name || product.name} (мало на складе)`);
                continue;
            }

            const images = Array.isArray(product.images) ? product.images : [];
            items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                image: images[0] || line.image || null,
                shopId: order.shopId,
                quantity: qty
            });
        }

        res.json({
            shopId: order.shopId,
            shopName: order.shop?.name,
            items,
            skipped
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.get('/:id/status-history', async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const order = await prisma.order.findFirst({
            where: { id: orderId, userId: Number(req.user.userId) }
        });
        if (!order) return res.status(404).json({ error: 'Заказ не найден' });

        const history = await prisma.orderStatusHistory.findMany({
            where: { orderId },
            include: {
                changedBy: { select: { id: true, name: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

export default router;
