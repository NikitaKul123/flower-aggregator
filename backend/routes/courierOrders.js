import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, resolveCourier } from '../middleware/auth.js';
import { getIo } from '../socket/io.js';
import { pushNotification, getUnreadCounts } from '../services/notificationService.js';
import { emitOrderStatusUpdated } from '../utils/orderSocket.js';
import { notifyCustomerStatusByEmail } from '../services/statusEmail.js';
import { saveBase64Image } from '../utils/saveImage.js';
import { orderStatusLabel } from '../utils/orderStatusLabels.js';

const router = Router();
const prisma = new PrismaClient();

const ROUTE_STATUSES = ['DELIVERING', 'READY', 'CONFIRMED', 'ASSEMBLING', 'NO_CONTACT'];

async function notifyStatusChange(updated, status, shopName, { courierName, extraMessage } = {}) {
    const label = orderStatusLabel(status);
    const courierNote = courierName ? ` (${courierName})` : '';
    const message = extraMessage || `Статус изменён на «${label}»`;

    await pushNotification({
        type: 'STATUS',
        title: `Заказ №${updated.id}`,
        message,
        link: '/orders',
        orderId: updated.id,
        groupKey: `status-${updated.id}`,
        userId: updated.userId
    });

    await pushNotification({
        type: 'STATUS',
        title: `Заказ №${updated.id}`,
        message: `Курьер: ${message}${courierNote}`,
        link: '/shop/orders',
        orderId: updated.id,
        groupKey: `status-${updated.id}`,
        shopId: updated.shopId
    });

    await notifyCustomerStatusByEmail({
        userId: updated.userId,
        orderId: updated.id,
        statusLabel: label,
        shopName
    });
}

async function emitCourierStatus(updated, courierId, shopId) {
    const unreadCounts = await getUnreadCounts({ userId: updated.userId });
    const shopCounts = await getUnreadCounts({ shopId });
    getIo().to(`shop_${shopId}`).emit('unread_counts', shopCounts);
    getIo().to(`courier_${courierId}`).emit('order_status_updated', {
        orderId: updated.id,
        status: updated.status
    });
    emitOrderStatusUpdated({
        shopId,
        userId: updated.userId,
        orderId: updated.id,
        status: updated.status,
        unreadCounts
    });
}

router.use(authenticateToken, resolveCourier);

router.get('/shop', async (req, res) => {
    try {
        const shop = await prisma.shop.findUnique({
            where: { id: Number(req.shopId) },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                avatar: true,
                deliveryTime: true
            }
        });
        if (!shop) {
            return res.status(404).json({ error: 'Магазин не найден' });
        }
        res.json(shop);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки магазина' });
    }
});

async function listCourierOrders(courierId, shopId, scope) {
    let statusWhere;
    if (scope === 'completed') {
        statusWhere = { status: 'DELIVERED' };
    } else if (scope === 'all') {
        statusWhere = { status: { not: 'CANCELLED' } };
    } else {
        statusWhere = { status: { notIn: ['CANCELLED', 'DELIVERED'] } };
    }

    return prisma.order.findMany({
        where: {
            courierId,
            shopId,
            isPickup: false,
            ...statusWhere
        },
        include: {
            shop: { select: { name: true, address: true, phone: true } }
        },
        orderBy: { updatedAt: 'desc' }
    });
}

const listHandler = (scope) => async (req, res) => {
    try {
        const courierId = Number(req.user.userId);
        const shopId = Number(req.shopId);
        const orders = await listCourierOrders(courierId, shopId, scope);
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
};

router.get('/map-route', async (req, res) => {
    try {
        const courierId = Number(req.user.userId);
        const shopId = Number(req.shopId);

        const [orders, shop] = await Promise.all([
            prisma.order.findMany({
                where: {
                    courierId,
                    shopId,
                    isPickup: false,
                    status: { in: ROUTE_STATUSES }
                },
                orderBy: [{ updatedAt: 'asc' }]
            }),
            prisma.shop.findUnique({
                where: { id: shopId },
                select: { name: true, address: true }
            })
        ]);

        // Без онлайн-геокодирования — ответ за миллисекунды; карта строится по адресам в Яндексе.
        const stops = orders.map((order) => {
            const info = order.deliveryInfo && typeof order.deliveryInfo === 'object'
                ? order.deliveryInfo
                : {};
            const lat = info.lat != null ? Number(info.lat) : null;
            const lng = info.lng != null ? Number(info.lng) : null;
            return {
                orderId: order.id,
                status: order.status,
                address: info.address || null,
                phone: info.phone || null,
                name: info.name || null,
                lat: Number.isFinite(lat) ? lat : null,
                lng: Number.isFinite(lng) ? lng : null
            };
        });

        const withCoords = stops.filter(s => s.lat != null && s.lng != null);
        const rtextParts = withCoords.map(s => `${s.lat},${s.lng}`);
        const yandexRouteUrl = rtextParts.length >= 2
            ? `https://yandex.ru/maps/?rtext=${rtextParts.join('~')}&rtt=auto`
            : rtextParts.length === 1
                ? `https://yandex.ru/maps/?pt=${rtextParts[0]}&z=16`
                : null;

        const addressParts = stops.map(s => s.address).filter(Boolean);
        const yandexAddressUrl = addressParts.length >= 2
            ? `https://yandex.ru/maps/?rtext=${addressParts.map(encodeURIComponent).join('~')}&rtt=auto`
            : addressParts[0]
                ? `https://yandex.ru/maps/?text=${encodeURIComponent(addressParts[0])}`
                : null;

        res.json({
            shop: shop ? { name: shop.name, address: shop.address, lat: null, lng: null } : null,
            stops,
            yandexRouteUrl: yandexRouteUrl || yandexAddressUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка построения маршрута' });
    }
});

router.get('/active', listHandler('active'));
router.get('/completed', listHandler('completed'));
router.get('/all', listHandler('all'));
router.get('/', listHandler('active'));

router.put('/:id/pickup', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const courierId = Number(req.user.userId);
        const shopId = Number(req.shopId);

        const order = await prisma.order.findFirst({
            where: { id, courierId, shopId, isPickup: false },
            include: { shop: { select: { name: true } } }
        });

        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const courierUser = await prisma.user.findUnique({
            where: { id: courierId },
            select: { name: true }
        });

        if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
            return res.status(400).json({ error: 'Заказ уже завершён' });
        }

        if (order.status === 'DELIVERING') {
            return res.json({ success: true, order });
        }

        const updated = await prisma.order.update({
            where: { id },
            data: { status: 'DELIVERING' }
        });

        await prisma.orderStatusHistory.create({
            data: {
                orderId: id,
                fromStatus: order.status,
                toStatus: 'DELIVERING',
                comment: 'Курьер забрал заказ',
                changedByUserId: courierId
            }
        });

        await notifyStatusChange(updated, 'DELIVERING', order.shop?.name, {
            courierName: courierUser?.name
        });

        await emitCourierStatus(updated, courierId, shopId);

        res.json({ success: true, order: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.put('/:id/no-contact', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const courierId = Number(req.user.userId);
        const shopId = Number(req.shopId);
        const { comment } = req.body || {};

        const order = await prisma.order.findFirst({
            where: { id, courierId, shopId, isPickup: false },
            include: { shop: { select: { name: true } } }
        });

        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
            return res.status(400).json({ error: 'Заказ уже завершён' });
        }

        if (order.status === 'NO_CONTACT') {
            return res.json({ success: true, order });
        }

        const courierUser = await prisma.user.findUnique({
            where: { id: courierId },
            select: { name: true }
        });

        const updated = await prisma.order.update({
            where: { id },
            data: { status: 'NO_CONTACT' }
        });

        await prisma.orderStatusHistory.create({
            data: {
                orderId: id,
                fromStatus: order.status,
                toStatus: 'NO_CONTACT',
                comment: comment?.trim() || 'Курьер не дозвонился до получателя',
                changedByUserId: courierId
            }
        });

        await notifyStatusChange(updated, 'NO_CONTACT', order.shop?.name, {
            courierName: courierUser?.name,
            extraMessage: 'Не удалось дозвониться до получателя'
        });

        await emitCourierStatus(updated, courierId, shopId);

        res.json({ success: true, order: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.put('/:id/deliver', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const courierId = Number(req.user.userId);
        const shopId = Number(req.shopId);
        const { photoBase64, signatureBase64, recipientName } = req.body || {};

        const order = await prisma.order.findFirst({
            where: { id, courierId, shopId, isPickup: false },
            include: { shop: { select: { name: true } } }
        });

        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const courierUser = await prisma.user.findUnique({
            where: { id: courierId },
            select: { name: true }
        });

        if (order.status === 'DELIVERED') {
            return res.json({ success: true, order });
        }

        if (order.status !== 'DELIVERING') {
            return res.status(400).json({ error: 'Сначала отметьте «Забрал заказ»' });
        }

        if (!photoBase64?.startsWith('data:image')) {
            return res.status(400).json({ error: 'Добавьте фото доставки' });
        }

        let deliveryPhoto;
        let recipientSignature;
        try {
            deliveryPhoto = saveBase64Image(photoBase64, 'delivery');
            if (!deliveryPhoto) {
                return res.status(400).json({ error: 'Не удалось сохранить фото' });
            }
            if (signatureBase64?.startsWith('data:image')) {
                recipientSignature = saveBase64Image(signatureBase64, 'signature');
            }
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Ошибка загрузки файла' });
        }

        const updated = await prisma.order.update({
            where: { id },
            data: {
                status: 'DELIVERED',
                deliveryPhoto,
                recipientSignature: recipientSignature || null,
                recipientName: recipientName?.trim() || null,
                deliveredAt: new Date()
            }
        });

        await prisma.orderStatusHistory.create({
            data: {
                orderId: id,
                fromStatus: order.status,
                toStatus: 'DELIVERED',
                comment: recipientName?.trim()
                    ? `Доставлено. Получатель: ${recipientName.trim()}`
                    : 'Доставлено курьером',
                changedByUserId: courierId
            }
        });

        await notifyStatusChange(updated, 'DELIVERED', order.shop?.name, {
            courierName: courierUser?.name
        });

        await emitCourierStatus(updated, courierId, shopId);

        res.json({ success: true, order: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

export default router;
