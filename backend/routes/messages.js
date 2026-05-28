import { Router } from 'express';

import { PrismaClient } from '@prisma/client';

import { authenticateToken, resolveShopAdmin, resolveActor } from '../middleware/auth.js';

import { getIo } from '../socket/io.js';

import { canReadOrderChat } from '../utils/orderAccess.js';

import { ForbiddenError } from '../utils/errors.js';

import { asyncHandler } from '../middleware/asyncHandler.js';

import {

    pushNotification,

    emitOrdersUnreadUpdate,

    emitNotificationUpdate

} from '../services/notificationService.js';

import { SHOP_MESSAGE_TEMPLATES } from '../utils/chatTemplates.js';

import { saveBase64Image } from '../utils/saveImage.js';



const router = Router();

const prisma = new PrismaClient();



function parseChannel(raw) {
    const v = String(raw || 'shop').toLowerCase().replace(/-/g, '_');
    if (v === 'courier') return 'COURIER';
    if (v === 'shop_courier') return 'SHOP_COURIER';
    return 'SHOP';
}

function assertCourierChatAvailable(order, channel) {
    if (channel !== 'COURIER' && channel !== 'SHOP_COURIER') return;
    if (order.isPickup || !order.courierId) {
        throw new ForbiddenError('Чат с курьером недоступен');
    }
}

function assertChannelAccess(channel, role) {
    if (channel === 'SHOP_COURIER') {
        if (role !== 'SHOP_ADMIN' && role !== 'COURIER') {
            throw new ForbiddenError('Чат магазина с курьером недоступен');
        }
    }
}



router.get('/templates', authenticateToken, resolveShopAdmin, (req, res) => {

    res.json(SHOP_MESSAGE_TEMPLATES);

});



router.get('/shop/conversations', authenticateToken, resolveShopAdmin, asyncHandler(async (req, res) => {

        const shopId = Number(req.shopId);

        const orders = await prisma.order.findMany({

            where: { shopId },

            include: {

                user: { select: { id: true, name: true } },

                messages: {

                    where: { channel: 'SHOP' },

                    orderBy: { createdAt: 'desc' },

                    take: 1

                }

            },

            orderBy: { updatedAt: 'desc' }

        });



        const orderIds = orders.map(o => o.id);

        const unreadGroups = orderIds.length

            ? await prisma.message.groupBy({

                by: ['orderId'],

                where: {

                    orderId: { in: orderIds },

                    channel: 'SHOP',

                    isRead: false,

                    isFromShop: false

                },

                _count: { _all: true }

            })

            : [];



        const unreadMap = new Map(unreadGroups.map(x => [x.orderId, x._count._all]));



        const deliveryName = (info) =>

            typeof info === 'object' && info !== null ? info.name : null;



        res.json(

            orders

                .map(o => {

                    const last = o.messages[0];

                    return {

                        orderId: o.id,

                        customerName: deliveryName(o.deliveryInfo) || o.user?.name,

                        lastMessage: last

                            ? last.text || (last.imageUrl ? '📷 Фото' : '')

                            : 'Нет сообщений',

                        lastAt: last?.createdAt || o.updatedAt,

                        unreadCount: unreadMap.get(o.id) || 0

                    };

                })

                .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))

        );

}));



router.get('/order/:orderId', authenticateToken, resolveActor, asyncHandler(async (req, res) => {

        const orderId = Number(req.params.orderId);

        const channel = parseChannel(req.query.channel);



        const order = await prisma.order.findUnique({

            where: { id: orderId },

            include: {

                shop: { select: { id: true, name: true, avatar: true } },

                user: { select: { id: true, name: true, avatar: true, phone: true } },

                courier: { select: { id: true, name: true, avatar: true, phone: true } }

            }

        });



        if (!order || !canReadOrderChat(order, req.user, req.shopId ?? req.user.shopId)) {

            throw new ForbiddenError('Нет доступа к этому заказу');

        }



        assertCourierChatAvailable(order, channel);
        assertChannelAccess(channel, req.user.role);

        const messages = await prisma.message.findMany({

            where: { orderId, channel },

            include: {

                user: { select: { id: true, name: true, avatar: true } }

            },

            orderBy: { createdAt: 'asc' }

        });



        const readOnlyCourier = channel === 'COURIER' && req.user.role === 'SHOP_ADMIN';
        const shopCourierChatAvailable = !!order.courierId && !order.isPickup;

        res.json({

            messages,

            shop: order.shop,

            customer: order.user,

            courier: order.courier,

            channel,

            courierChatAvailable: shopCourierChatAvailable,

            shopCourierChatAvailable,

            readOnly: readOnlyCourier

        });

}));



router.put('/order/:orderId/read', authenticateToken, resolveActor, asyncHandler(async (req, res) => {

        const orderId = Number(req.params.orderId);

        const channel = parseChannel(req.query.channel);



        const order = await prisma.order.findUnique({

            where: { id: orderId },

            select: {

                id: true,

                userId: true,

                shopId: true,

                courierId: true,

                isPickup: true

            }

        });



        if (!order || !canReadOrderChat(order, req.user, req.shopId ?? req.user.shopId)) {

            throw new ForbiddenError('Нет доступа к этому заказу');

        }



        assertCourierChatAvailable(order, channel);
        assertChannelAccess(channel, req.user.role);

        if (channel === 'COURIER' && req.user.role === 'SHOP_ADMIN') {
            return res.json({ success: true, updated: 0 });
        }

        const role = req.user.role;

        let incomingFilter;

        if (channel === 'SHOP_COURIER') {
            incomingFilter = { isFromCourier: true };
            if (role === 'COURIER') incomingFilter = { isFromShop: true };
        } else if (channel === 'COURIER') {
            incomingFilter = { isFromCourier: true };
            if (role === 'COURIER') incomingFilter = { isFromCourier: false };
        } else {
            incomingFilter = { isFromShop: true };
            if (role === 'SHOP_ADMIN') incomingFilter = { isFromShop: false };
        }



        const updated = await prisma.message.updateMany({

            where: {

                orderId,

                channel,

                isRead: false,

                ...incomingFilter

            },

            data: { isRead: true }

        });



        const groupKey =
            channel === 'COURIER'
                ? `chat-courier-${orderId}`
                : channel === 'SHOP_COURIER'
                    ? `chat-shop-courier-${orderId}`
                    : `chat-${orderId}`;

        await prisma.notification.updateMany({

            where: {

                groupKey,

                ...(role === 'SHOP_ADMIN'

                    ? { shopId: Number(order.shopId) }

                    : { userId: Number(req.user.userId) })

            },

            data: { readAt: new Date(), count: 1 }

        });



        emitNotificationUpdate({

            userId: order.userId,

            shopId: order.shopId

        });



        if (order.courierId) {

            emitNotificationUpdate({ userId: order.courierId });

        }



        getIo().to(`order-${orderId}`).emit('messages_read', {

            orderId,

            channel,

            readByShop: role === 'SHOP_ADMIN',

            readByCourier: role === 'COURIER'

        });



        try {
            await emitOrdersUnreadUpdate({
                userId: order.userId,
                shopId: order.shopId,
                orderId,
                courierId: order.courierId ?? undefined
            });
        } catch (e) {
            console.error('emitOrdersUnreadUpdate:', e);
        }

        res.json({ success: true, updated: updated.count });

}));



router.post('/order/:orderId', authenticateToken, resolveActor, asyncHandler(async (req, res) => {

        const { text, imageBase64, channel: rawChannel } = req.body;

        const orderId = Number(req.params.orderId);

        const channel = parseChannel(rawChannel);



        const order = await prisma.order.findUnique({

            where: { id: orderId },

            select: {

                id: true,

                userId: true,

                shopId: true,

                courierId: true,

                isPickup: true

            }

        });



        if (!order || !canReadOrderChat(order, req.user, req.shopId ?? req.user.shopId)) {

            throw new ForbiddenError('Нет доступа к этому заказу');

        }



        assertCourierChatAvailable(order, channel);
        assertChannelAccess(channel, req.user.role);

        if (channel === 'COURIER' && req.user.role === 'SHOP_ADMIN') {
            throw new ForbiddenError('Магазин может только просматривать чат клиента с курьером');
        }

        if (channel === 'SHOP' && req.user.role === 'COURIER') {
            throw new ForbiddenError('Курьер не может писать в чат клиента с магазином');
        }



        if (channel === 'COURIER' && req.user.role === 'COURIER' && Number(order.courierId) !== Number(req.user.userId)) {

            throw new ForbiddenError('Заказ назначен другому курьеру');

        }



        let imageUrl = null;

        if (imageBase64) {

            imageUrl = saveBase64Image(imageBase64);

        }



        if (!text?.trim() && !imageUrl) {

            return res.status(400).json({ error: 'Введите сообщение или прикрепите фото' });

        }



        const isFromShop =
            (channel === 'SHOP' || channel === 'SHOP_COURIER') && req.user.role === 'SHOP_ADMIN';

        const isFromCourier =
            (channel === 'COURIER' || channel === 'SHOP_COURIER') && req.user.role === 'COURIER';



        const message = await prisma.message.create({

            data: {

                text: text?.trim() || null,

                imageUrl,

                userId: Number(req.user.userId),

                orderId,

                channel,

                isFromShop,

                isFromCourier,

                deliveredAt: new Date()

            },

            include: {

                user: { select: { id: true, name: true, avatar: true } }

            }

        });



        const groupKey =
            channel === 'COURIER'
                ? `chat-courier-${orderId}`
                : channel === 'SHOP_COURIER'
                    ? `chat-shop-courier-${orderId}`
                    : `chat-${orderId}`;

        if (channel === 'SHOP') {

            if (!message.isFromShop) {

                await pushNotification({

                    type: 'CHAT',

                    title: `Заказ №${orderId}`,

                    message: `Новое сообщение по заказу №${orderId}`,

                    link: `/shop/orders/${orderId}/chat`,

                    orderId,

                    groupKey,

                    shopId: order.shopId

                });

            } else {

                await pushNotification({

                    type: 'CHAT',

                    title: `Заказ №${orderId}`,

                    message: `Новое сообщение от магазина`,

                    link: `/orders/${orderId}/chat`,

                    orderId,

                    groupKey,

                    userId: order.userId

                });

            }

        } else if (channel === 'SHOP_COURIER') {
            if (isFromCourier) {
                await pushNotification({
                    type: 'CHAT',
                    title: `Заказ №${orderId}`,
                    message: `Сообщение от курьера`,
                    link: `/shop/orders/${orderId}/chat?channel=shop-courier`,
                    orderId,
                    groupKey,
                    shopId: order.shopId
                });
            } else {
                await pushNotification({
                    type: 'CHAT',
                    title: `Заказ №${orderId}`,
                    message: `Сообщение от магазина`,
                    link: `/courier/orders/${orderId}/chat?tab=shop`,
                    orderId,
                    groupKey,
                    userId: order.courierId
                });
            }
        } else if (isFromCourier) {
            await pushNotification({
                type: 'CHAT',
                title: `Заказ №${orderId}`,
                message: `Сообщение от курьера`,
                link: `/orders/${orderId}/chat?channel=courier`,
                orderId,
                groupKey,
                userId: order.userId
            });
        } else {
            await pushNotification({
                type: 'CHAT',
                title: `Заказ №${orderId}`,
                message: `Сообщение от клиента`,
                link: `/courier/orders/${orderId}/chat`,
                orderId,
                groupKey,
                userId: order.courierId
            });
        }



        try {
            await emitOrdersUnreadUpdate({
                userId: order.userId,
                shopId: order.shopId,
                orderId,
                courierId: (channel === 'COURIER' || channel === 'SHOP_COURIER') ? order.courierId : undefined
            });
        } catch (e) {
            console.error('emitOrdersUnreadUpdate:', e);
        }

        const io = getIo();

        const payload = { ...message, channel };

        io.to(`order-${orderId}`).emit('new_message', payload);

        if (channel === 'SHOP' || channel === 'COURIER') {
            io.to(`customer_${order.userId}`).emit('new_message', payload);
        }

        if (channel === 'SHOP' && !message.isFromShop) {
            io.to(`shop_${order.shopId}`).emit('new_message', payload);
        }

        if (channel === 'SHOP_COURIER') {
            io.to(`shop_${order.shopId}`).emit('new_message', payload);
            if (order.courierId) {
                io.to(`courier_${order.courierId}`).emit('new_message', payload);
            }
        }

        if (channel === 'COURIER' && order.courierId) {
            io.to(`courier_${order.courierId}`).emit('new_message', payload);
        }



        res.json(message);

}));



export default router;


