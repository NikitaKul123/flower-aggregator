import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, resolveShopAdmin } from '../middleware/auth.js';
import { getIo } from '../socket/io.js';
import { emitOrderStatusUpdated } from '../utils/orderSocket.js';
import { pushNotification, getUnreadCounts } from '../services/notificationService.js';
import { notifyCustomerStatusByEmail } from '../services/statusEmail.js';
import { buildOrderWhere, matchesSearch, orderToCsvRow, CSV_HEADER } from '../utils/orderFilters.js';
import { ORDER_STATUS_LABELS as STATUS_LABELS } from '../utils/orderStatusLabels.js';

const router = Router();
const prisma = new PrismaClient();

async function notifyStatusChange(updated, status, shopName) {
    const label = STATUS_LABELS[status] || status;
    await pushNotification({
        type: 'STATUS',
        title: `Заказ №${updated.id}`,
        message: `Статус изменён на «${label}»`,
                link: `/orders?highlight=${updated.id}`,
        orderId: updated.id,
        groupKey: `status-${updated.id}`,
        userId: updated.userId
    });
    await notifyCustomerStatusByEmail({
        userId: updated.userId,
        orderId: updated.id,
        statusLabel: label,
        shopName
    });
}

async function attachUnreadCounts(orders) {
    const orderIds = orders.map(o => o.id);
    if (!orderIds.length) return orders.map(o => ({ ...o, unreadMessageCount: 0 }));

    const unread = await prisma.message.groupBy({
        by: ['orderId'],
        where: {
            orderId: { in: orderIds },
            channel: 'SHOP',
            isRead: false,
            isFromShop: false
        },
        _count: { _all: true }
    });

    const map = new Map(unread.map(x => [x.orderId, x._count._all]));
    return orders.map(o => ({
        ...o,
        unreadMessageCount: map.get(o.id) || 0
    }));
}

async function fetchShopOrders(req) {
    const shopId = Number(req.shopId);
    const where = buildOrderWhere(req.query, { shopId });

    let orders = await prisma.order.findMany({
        where,
        include: {
            user: {
                select: { id: true, name: true, email: true, phone: true }
            },
            courier: {
                select: { id: true, name: true, phone: true, avatar: true }
            },
            review: {
                select: {
                    id: true,
                    rating: true,
                    text: true,
                    shopReply: true,
                    shopReplyAt: true,
                    createdAt: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    orders = await attachUnreadCounts(orders);

    if (req.query.search) {
        orders = orders.filter(o => matchesSearch(o, req.query.search, true));
    }

    if (req.query.onlyUnread === 'true') {
        orders = orders.filter(o => Number(o.unreadMessageCount) > 0);
    }

    return orders;
}

router.use(authenticateToken, resolveShopAdmin);

router.get('/', async (req, res) => {
    try {
        res.json(await fetchShopOrders(req));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
});

router.get('/export', async (req, res) => {
    try {
        const orders = await fetchShopOrders(req);
        const rows = orders.map(orderToCsvRow);
        const csv = '\uFEFF' + [CSV_HEADER, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="orders-export.csv"'
        );
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка экспорта' });
    }
});

router.put('/:id/notes', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const shopId = Number(req.shopId);
        const order = await prisma.order.findFirst({ where: { id, shopId } });
        if (!order) return res.status(404).json({ error: 'Заказ не найден' });

        const shopNotes =
            req.body.shopNotes !== undefined ? String(req.body.shopNotes).trim().slice(0, 5000) : null;

        const updated = await prisma.order.update({
            where: { id },
            data: { shopNotes: shopNotes || null }
        });
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сохранения заметки' });
    }
});

router.get('/:id/status-history', async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const order = await prisma.order.findFirst({
            where: { id: orderId, shopId: Number(req.shopId) }
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

router.put('/bulk-status', async (req, res) => {
    try {
        const { orderIds, status, comment } = req.body;
        if (!Array.isArray(orderIds) || !orderIds.length || !status) {
            return res.status(400).json({ error: 'Укажите orderIds и status' });
        }

        const shopId = Number(req.shopId);
        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            select: { name: true }
        });
        const shopName = shop?.name;

        const results = [];

        for (const rawId of orderIds) {
            const id = Number(rawId);
            const order = await prisma.order.findFirst({
                where: { id, shopId }
            });
            if (!order) continue;

            const updated = await prisma.order.update({
                where: { id },
                data: { status },
                include: { user: true }
            });

            await prisma.orderStatusHistory.create({
                data: {
                    orderId: id,
                    fromStatus: order.status,
                    toStatus: status,
                    comment: comment || null,
                    changedByUserId: req.user.userId
                }
            });

            await notifyStatusChange(updated, status, shopName);

            const unreadCounts = await getUnreadCounts({ userId: updated.userId });
            emitOrderStatusUpdated({
                shopId,
                userId: updated.userId,
                orderId: updated.id,
                status: updated.status,
                unreadCounts
            });

            results.push(updated);
        }

        res.json({ success: true, updated: results.length, orders: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка массового обновления' });
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status, comment } = req.body;
        const shopId = Number(req.shopId);

        const order = await prisma.order.findFirst({
            where: { id, shopId }
        });

        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const updated = await prisma.order.update({
            where: { id },
            data: { status },
            include: { user: true, shop: { select: { name: true } } }
        });

        await prisma.orderStatusHistory.create({
            data: {
                orderId: id,
                fromStatus: order.status,
                toStatus: status,
                comment: comment || null,
                changedByUserId: req.user.userId
            }
        });

        await notifyStatusChange(updated, status, updated.shop?.name);

        const unreadCounts = await getUnreadCounts({ userId: updated.userId });
        emitOrderStatusUpdated({
            shopId,
            userId: updated.userId,
            orderId: updated.id,
            status: updated.status,
            unreadCounts
        });

        getIo().to(`order-${id}`).emit('status-changed', {
            orderId: updated.id,
            status: updated.status
        });

        res.json({ success: true, order: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
});

router.put('/:id/courier', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const shopId = Number(req.shopId);
        const rawCourierId = req.body.courierId;

        const order = await prisma.order.findFirst({
            where: { id, shopId }
        });

        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        if (order.isPickup) {
            return res.status(400).json({ error: 'Для самовывоза курьер не назначается' });
        }

        if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
            return res.status(400).json({ error: 'Нельзя изменить курьера для завершённого заказа' });
        }

        let courierId = null;
        let courierUser = null;

        if (rawCourierId != null && rawCourierId !== '') {
            courierId = Number(rawCourierId);
            const link = await prisma.shopCourier.findFirst({
                where: { shopId, userId: courierId, isActive: true },
                include: { user: { select: { id: true, name: true, phone: true } } }
            });
            if (!link) {
                return res.status(400).json({ error: 'Курьер не найден или отключён' });
            }
            courierUser = link.user;
        }

        const updated = await prisma.order.update({
            where: { id },
            data: {
                courierId,
                courierAssignedAt: courierId ? new Date() : null
            },
            include: {
                courier: { select: { id: true, name: true, phone: true, avatar: true } }
            }
        });

        if (courierId && courierUser) {
            const shop = await prisma.shop.findUnique({
                where: { id: shopId },
                select: { name: true }
            });
            const assignShopName = shop?.name || 'Магазин';

            await pushNotification({
                type: 'ORDER',
                title: `Заказ №${id}`,
                message: `${assignShopName} назначил вам доставку`,
                link: '/courier/orders',
                orderId: id,
                groupKey: `courier-order-${id}`,
                userId: courierId
            });
            await pushNotification({
                type: 'STATUS',
                title: `Заказ №${id}`,
                message: `Курьер: ${courierUser.name}${courierUser.phone ? `, ${courierUser.phone}` : ''}`,
                link: '/orders',
                orderId: id,
                groupKey: `status-${id}`,
                userId: order.userId
            });
            const unreadCounts = await getUnreadCounts({ userId: courierId });
            getIo().to(`courier_${courierId}`).emit('order_assigned', {
                orderId: id,
                order: updated,
                unreadCounts
            });
        }

        res.json({ success: true, order: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка назначения курьера' });
    }
});

export default router;
