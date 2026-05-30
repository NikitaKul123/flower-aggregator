import { PrismaClient } from '@prisma/client';

import { getIo } from '../socket/io.js';
import { sendWebPushToRecipient } from './webPushService.js';



const prisma = new PrismaClient();



function isInDndWindow(settings) {

    if (!settings?.doNotDisturb || !settings.dndFrom || !settings.dndTo) {

        return !!settings?.doNotDisturb && !settings?.dndFrom;

    }

    const now = new Date();

    const [fh, fm] = settings.dndFrom.split(':').map(Number);

    const [th, tm] = settings.dndTo.split(':').map(Number);

    const mins = now.getHours() * 60 + now.getMinutes();

    const from = fh * 60 + (fm || 0);

    const to = th * 60 + (tm || 0);

    if (from <= to) return mins >= from && mins < to;

    return mins >= from || mins < to;

}



async function getSettings({ userId, shopId }) {

    if (shopId) {

        let s = await prisma.notificationSettings.findUnique({ where: { shopId } });

        if (!s) {

            s = await prisma.notificationSettings.create({ data: { shopId } });

        }

        return s;

    }

    if (userId) {

        let s = await prisma.notificationSettings.findUnique({ where: { userId } });

        if (!s) {

            s = await prisma.notificationSettings.create({ data: { userId } });

        }

        return s;

    }

    return null;

}



function shouldNotify(settings, type) {

    if (!settings) return true;

    if (isInDndWindow(settings)) return false;

    if (type === 'ORDER' && !settings.enableOrder) return false;

    if (type === 'CHAT' && !settings.enableChat) return false;

    if (type === 'STATUS' && !settings.enableStatus) return false;

    if (type === 'STOCK' && settings.enableStock === false) return false;

    if (type === 'SHOP' && settings.enableShop === false) return false;

    return true;

}



async function maybeSendWebPush({ settings, type, userId, shopId, title, message, link, groupKey }) {
    if (!settings?.enableBrowserPush) return;
    if (!shouldNotify(settings, type)) return;

    void sendWebPushToRecipient({
        userId,
        shopId,
        title,
        body: message,
        link,
        tag: groupKey || `${type}-${userId || shopId}-${Date.now()}`
    });
}



/** Запись в ленту: статусы всегда (для счётчика), остальное — по настройкам */
function shouldPersistNotification(settings, type) {
    if (!settings) return true;
    if (isInDndWindow(settings)) return false;
    if (type === 'STATUS' || type === 'STOCK' || type === 'SHOP') return true;
    return shouldNotify(settings, type);
}



function recipientWhere({ userId, shopId }) {

    return userId

        ? { userId: Number(userId) }

        : { shopId: Number(shopId) };

}



/** Одна карточка на groupKey (берём самую свежую; при равенстве — непрочитанную) */

function dedupeNotifications(list) {

    const map = new Map();

    for (const n of list) {

        const key = n.groupKey || `id-${n.id}`;

        const prev = map.get(key);

        if (!prev) {

            map.set(key, n);

            continue;

        }

        const nUnread = !n.readAt;

        const pUnread = !prev.readAt;

        if (nUnread && !pUnread) {

            map.set(key, n);

        } else if (nUnread === pUnread && new Date(n.updatedAt) > new Date(prev.updatedAt)) {

            map.set(key, n);

        }

    }

    return Array.from(map.values());

}



async function emitUnreadCounts({ userId, shopId }) {
    const io = getIo();
    if (!io) return;
    try {
        const counts = await getUnreadCounts({ userId, shopId });
        if (userId) {
            io.to(`customer_${userId}`).emit('unread_counts', counts);
            io.to(`courier_${userId}`).emit('unread_counts', counts);
        }
        if (shopId) {
            io.to(`shop_${shopId}`).emit('unread_counts', counts);
        }
    } catch (e) {
        console.error('emitUnreadCounts:', e);
    }
}

function emitNotificationUpdate({ userId, shopId }) {
    const io = getIo();
    if (!io) return;
    if (userId) {
        io.to(`customer_${userId}`).emit('notifications_updated');
        io.to(`courier_${userId}`).emit('notifications_updated');
    }
    if (shopId) io.to(`shop_${shopId}`).emit('notifications_updated');
    void emitUnreadCounts({ userId, shopId });
}

async function emitOrdersUnreadUpdate({ userId, shopId, orderId, courierId }) {
    const io = getIo();
    if (!io) return;
    const payload = orderId != null ? { orderId: Number(orderId) } : {};
    if (userId) io.to(`customer_${userId}`).emit('orders_unread_updated', payload);
    if (shopId) io.to(`shop_${shopId}`).emit('orders_unread_updated', payload);
    let cid = courierId != null ? Number(courierId) : null;
    if (!cid && orderId) {
        const order = await prisma.order.findUnique({
            where: { id: Number(orderId) },
            select: { courierId: true }
        });
        cid = order?.courierId ?? null;
    }
    if (cid) io.to(`courier_${cid}`).emit('orders_unread_updated', payload);
    void emitUnreadCounts({ userId, shopId });
    if (cid) void emitUnreadCounts({ userId: cid });
}



async function chatReadWhere(orderId, { userId, shopId, groupKey }) {
    const oid = Number(orderId);
    const gk = groupKey || '';

    if (shopId) {
        if (gk.startsWith('chat-shop-courier-')) {
            return { orderId: oid, channel: 'SHOP_COURIER', isRead: false, isFromCourier: true };
        }
        return { orderId: oid, channel: 'SHOP', isRead: false, isFromShop: false };
    }

    if (!userId) return null;

    const uid = Number(userId);
    const courierLink = await prisma.shopCourier.findUnique({
        where: { userId: uid },
        select: { userId: true }
    });

    if (courierLink) {
        if (gk.startsWith('chat-shop-courier-')) {
            return {
                orderId: oid,
                channel: 'SHOP_COURIER',
                isRead: false,
                isFromShop: true,
                order: { courierId: uid }
            };
        }
        return {
            orderId: oid,
            channel: 'COURIER',
            isRead: false,
            isFromCourier: false,
            order: { courierId: uid }
        };
    }

    if (gk.startsWith('chat-courier-')) {
        return { orderId: oid, channel: 'COURIER', isRead: false, isFromCourier: true };
    }
    return { orderId: oid, channel: 'SHOP', isRead: false, isFromShop: true };
}

async function markChatMessagesReadForOrder(orderId, { userId, shopId, groupKey }) {
    let gk = groupKey;
    if (!gk && shopId) gk = `chat-${orderId}`;
    if (!gk && userId) {
        const courierLink = await prisma.shopCourier.findUnique({
            where: { userId: Number(userId) },
            select: { userId: true }
        });
        gk = courierLink ? `chat-courier-${orderId}` : `chat-${orderId}`;
    }

    const where = await chatReadWhere(orderId, { userId, shopId, groupKey: gk });
    if (!where) return;
    await prisma.message.updateMany({ where, data: { isRead: true } });
}



async function markAllChatMessagesRead({ userId, shopId }) {

    if (userId) {
        const uid = Number(userId);
        const courierLink = await prisma.shopCourier.findUnique({
            where: { userId: uid },
            select: { userId: true }
        });

        if (courierLink) {
            await prisma.message.updateMany({
                where: {
                    channel: 'COURIER',
                    isRead: false,
                    isFromCourier: false,
                    order: { courierId: uid }
                },
                data: { isRead: true }
            });
            await prisma.message.updateMany({
                where: {
                    channel: 'SHOP_COURIER',
                    isRead: false,
                    isFromShop: true,
                    order: { courierId: uid }
                },
                data: { isRead: true }
            });
        } else {
            const orders = await prisma.order.findMany({
                where: { userId: uid },
                select: { id: true }
            });
            const orderIds = orders.map(o => o.id);
            if (orderIds.length) {
                await prisma.message.updateMany({
                    where: {
                        orderId: { in: orderIds },
                        channel: 'SHOP',
                        isRead: false,
                        isFromShop: true
                    },
                    data: { isRead: true }
                });
                await prisma.message.updateMany({
                    where: {
                        orderId: { in: orderIds },
                        channel: 'COURIER',
                        isRead: false,
                        isFromCourier: true
                    },
                    data: { isRead: true }
                });
            }
        }

        emitOrdersUnreadUpdate({ userId: uid });

        return;

    }

    if (shopId) {

        const orders = await prisma.order.findMany({

            where: { shopId: Number(shopId) },

            select: { id: true }

        });

        const orderIds = orders.map(o => o.id);

        if (orderIds.length) {
            await prisma.message.updateMany({
                where: {
                    orderId: { in: orderIds },
                    channel: 'SHOP',
                    isRead: false,
                    isFromShop: false
                },
                data: { isRead: true }
            });
            await prisma.message.updateMany({
                where: {
                    orderId: { in: orderIds },
                    channel: 'SHOP_COURIER',
                    isRead: false,
                    isFromCourier: true
                },
                data: { isRead: true }
            });
        }

        emitOrdersUnreadUpdate({ shopId: Number(shopId) });

    }

}



/**

 * Create or aggregate notification by groupKey (в т.ч. повторно открыть прочитанную)

 */

export async function pushNotification({

    type,

    title,

    message,

    link,

    orderId,

    groupKey,

    userId,

    shopId

}) {

    const uid = userId ? Number(userId) : null;

    const sid = shopId ? Number(shopId) : null;



    const settings = await getSettings({ userId: uid, shopId: sid });

    if (!shouldPersistNotification(settings, type)) {
        void emitUnreadCounts({ userId: uid, shopId: sid });
        return null;
    }



    const rec = uid ? { userId: uid } : { shopId: sid };



    if (groupKey) {

        const existing = await prisma.notification.findFirst({

            where: { ...rec, groupKey },

            orderBy: { updatedAt: 'desc' }

        });



        if (existing) {

            const wasRead = !!existing.readAt;

            const updated = await prisma.notification.update({

                where: { id: existing.id },

                data: {

                    readAt: null,

                    count: wasRead ? 1 : existing.count + 1,

                    message,

                    title,

                    link,

                    orderId: orderId != null ? Number(orderId) : existing.orderId,

                    updatedAt: new Date()

                }

            });

            emitNotificationUpdate({ userId: uid, shopId: sid });

            void maybeSendWebPush({
                settings,
                type,
                userId: uid,
                shopId: sid,
                title,
                message,
                link,
                groupKey
            });

            return updated;

        }

    }



    const created = await prisma.notification.create({

        data: {

            type,

            title,

            message,

            link,

            orderId: orderId != null ? Number(orderId) : null,

            groupKey: groupKey || null,

            userId: uid,

            shopId: sid

        }

    });



    emitNotificationUpdate({ userId: uid, shopId: sid });

    void maybeSendWebPush({
        settings,
        type,
        userId: uid,
        shopId: sid,
        title,
        message,
        link,
        groupKey
    });

    return created;

}



function countByGroupKeys(list) {
    return new Set(list.map(n => n.groupKey || `id-${n.id}`)).size;
}

/** Все непрочитанные карточки (legacy) */
export async function getUnreadCount({ userId, shopId }) {
    const list = await prisma.notification.findMany({
        where: { readAt: null, ...recipientWhere({ userId, shopId }) },
        select: { id: true, groupKey: true }
    });
    return countByGroupKeys(list);
}

/** Колокольчик: все непрочитанные (статусы, чат, заказы) */
export async function getInboxUnreadCount({ userId, shopId }) {
    const list = await prisma.notification.findMany({
        where: {
            readAt: null,
            ...recipientWhere({ userId, shopId })
        },
        select: { id: true, groupKey: true }
    });

    const keys = new Set(list.map(n => n.groupKey || `id-${n.id}`));

    // Непрочитанный чат (даже если карточка уведомления не создалась из‑за настроек)
    if (userId) {
        const uid = Number(userId);
        const courierLink = await prisma.shopCourier.findUnique({
            where: { userId: uid },
            select: { userId: true }
        });

        if (courierLink) {
            const chatOrders = await prisma.message.findMany({
                where: {
                    channel: 'COURIER',
                    isRead: false,
                    isFromCourier: false,
                    order: { courierId: uid }
                },
                select: { orderId: true },
                distinct: ['orderId']
            });
            chatOrders.forEach(r => keys.add(`chat-courier-${r.orderId}`));
            const shopCourierChat = await prisma.message.findMany({
                where: {
                    channel: 'SHOP_COURIER',
                    isRead: false,
                    isFromShop: true,
                    order: { courierId: uid }
                },
                select: { orderId: true },
                distinct: ['orderId']
            });
            shopCourierChat.forEach(r => keys.add(`chat-shop-courier-${r.orderId}`));
        } else {
            const chatOrders = await prisma.message.findMany({
                where: {
                    channel: 'SHOP',
                    isRead: false,
                    isFromShop: true,
                    order: { userId: uid }
                },
                select: { orderId: true },
                distinct: ['orderId']
            });
            chatOrders.forEach(r => keys.add(`chat-${r.orderId}`));
            const courierChat = await prisma.message.findMany({
                where: {
                    channel: 'COURIER',
                    isRead: false,
                    isFromCourier: true,
                    order: { userId: uid }
                },
                select: { orderId: true },
                distinct: ['orderId']
            });
            courierChat.forEach(r => keys.add(`chat-courier-${r.orderId}`));
        }
    } else if (shopId) {
        const sid = Number(shopId);
        const chatOrders = await prisma.message.findMany({
            where: {
                channel: 'SHOP',
                isRead: false,
                isFromShop: false,
                order: { shopId: sid }
            },
            select: { orderId: true },
            distinct: ['orderId']
        });
        chatOrders.forEach(r => keys.add(`chat-${r.orderId}`));
        const shopCourierChat = await prisma.message.findMany({
            where: {
                channel: 'SHOP_COURIER',
                isRead: false,
                isFromCourier: true,
                order: { shopId: sid }
            },
            select: { orderId: true },
            distinct: ['orderId']
        });
        shopCourierChat.forEach(r => keys.add(`chat-shop-courier-${r.orderId}`));
    }

    return keys.size;
}

/** «Мои заказы» у клиента: непрочитанный статус или сообщения магазина */
export async function getCustomerOrdersUnreadCount(userId) {
    const uid = Number(userId);
    const orderIds = new Set();

    const statusRows = await prisma.notification.findMany({
        where: { userId: uid, type: 'STATUS', readAt: null, orderId: { not: null } },
        select: { orderId: true }
    });
    statusRows.forEach(r => orderIds.add(r.orderId));

    const chatRows = await prisma.message.findMany({
        where: {
            channel: 'SHOP',
            isRead: false,
            isFromShop: true,
            order: { userId: uid }
        },
        select: { orderId: true },
        distinct: ['orderId']
    });
    chatRows.forEach(r => orderIds.add(r.orderId));

    const courierChatRows = await prisma.message.findMany({
        where: {
            channel: 'COURIER',
            isRead: false,
            isFromCourier: true,
            order: { userId: uid }
        },
        select: { orderId: true },
        distinct: ['orderId']
    });
    courierChatRows.forEach(r => orderIds.add(r.orderId));

    return orderIds.size;
}

/** Заказы магазина: новые заказы (уведомления) + непрочитанный чат от клиентов */
export async function getShopOrdersUnreadCount(shopId) {
    const sid = Number(shopId);
    const orderIds = new Set();

    const orderNotifs = await prisma.notification.findMany({
        where: { shopId: sid, type: 'ORDER', readAt: null, orderId: { not: null } },
        select: { orderId: true }
    });
    orderNotifs.forEach(r => orderIds.add(r.orderId));

    const chatRows = await prisma.message.findMany({
        where: {
            isRead: false,
            isFromShop: false,
            order: { shopId: sid }
        },
        select: { orderId: true },
        distinct: ['orderId']
    });
    chatRows.forEach(r => orderIds.add(r.orderId));

    return orderIds.size;
}

export async function getUnreadCounts({ userId, shopId }) {
    if (shopId) {
        return {
            count: await getInboxUnreadCount({ shopId }),
            ordersCount: await getShopOrdersUnreadCount(shopId)
        };
    }
    return {
        count: await getInboxUnreadCount({ userId }),
        ordersCount: await getCustomerOrdersUnreadCount(userId)
    };
}



export async function listNotifications({ userId, shopId }) {

    const all = await prisma.notification.findMany({

        where: recipientWhere({ userId, shopId }),

        orderBy: [

            { readAt: 'asc' },

            { updatedAt: 'desc' }

        ]

    });

    return dedupeNotifications(all);

}



export async function markRead(id, { userId, shopId }) {

    const n = await prisma.notification.findFirst({

        where: {

            id: Number(id),

            ...recipientWhere({ userId, shopId })

        }

    });

    if (!n) return null;



    const updated = await prisma.notification.update({

        where: { id: n.id },

        data: { readAt: new Date(), count: 1 }

    });



    if (updated.type === 'CHAT' && updated.orderId) {

        await markChatMessagesReadForOrder(updated.orderId, {
            userId,
            shopId,
            groupKey: updated.groupKey
        });

        emitOrdersUnreadUpdate({

            userId: userId ? Number(userId) : null,

            shopId: shopId ? Number(shopId) : null,

            orderId: updated.orderId

        });

    }



    emitNotificationUpdate({ userId, shopId });

    return updated;

}



export async function markAllRead({ userId, shopId }) {

    const rec = recipientWhere({ userId, shopId });



    await prisma.notification.updateMany({

        where: { readAt: null, ...rec },

        data: { readAt: new Date(), count: 1 }

    });



    await markAllChatMessagesRead({ userId, shopId });

    emitNotificationUpdate({ userId, shopId });

}



export async function markStatusNotificationsReadForOrder(orderId, { userId, shopId }) {
    const rec = recipientWhere({ userId, shopId });
    const oid = Number(orderId);
    const groupKey = `status-${oid}`;

    const result = await prisma.notification.updateMany({
        where: {
            ...rec,
            readAt: null,
            OR: [{ groupKey }, { orderId: oid, type: 'STATUS' }]
        },
        data: { readAt: new Date(), count: 1 }
    });

    if (result.count > 0) {
        emitNotificationUpdate({ userId, shopId });
    }

    return result.count;
}

export {
    emitNotificationUpdate,
    emitOrdersUnreadUpdate,
    emitUnreadCounts,
    markAllChatMessagesRead,
    markChatMessagesReadForOrder
};

export { getSettings, isInDndWindow };


