import { PrismaClient } from '@prisma/client';
import { getIo } from '../socket/io.js';
import { pushNotification } from './notificationService.js';
import { isSuperAdminRole } from '../middleware/auth.js';

const prisma = new PrismaClient();

function previewText(msg) {
    if (!msg) return '';
    if (msg.text) return msg.text;
    if (msg.imageUrl) return '📷 Фото';
    return 'Сообщение';
}

export async function listPlatformMessages(shopId, limit = 200) {
    return prisma.shopPlatformMessage.findMany({
        where: { shopId },
        orderBy: { createdAt: 'asc' },
        take: limit,
        include: {
            sender: { select: { id: true, name: true, role: true } }
        }
    });
}

export async function markPlatformMessagesRead(shopId, forPlatform) {
    await prisma.shopPlatformMessage.updateMany({
        where: {
            shopId,
            isFromPlatform: !forPlatform,
            isRead: false
        },
        data: { isRead: true }
    });
}

export async function sendPlatformMessage({ shopId, senderUserId, isFromPlatform, text, imageUrl }) {
    const cleanText = text ? String(text).trim() : null;
    if (!cleanText && !imageUrl) {
        throw new Error('Пустое сообщение');
    }

    const message = await prisma.shopPlatformMessage.create({
        data: {
            shopId,
            senderUserId,
            isFromPlatform,
            text: cleanText,
            imageUrl: imageUrl || null
        },
        include: {
            sender: { select: { id: true, name: true, role: true } }
        }
    });

    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { id: true, name: true, ownerId: true }
    });

    const io = getIo();
    const payload = { ...message, shopId };
    if (io) {
        io.to(`shop_${shopId}`).emit('platform_message', payload);
        io.to('platform_admin').emit('platform_message', { ...payload, shopName: shop?.name });
    }

    const snippet = previewText(message).slice(0, 120);

    if (isFromPlatform && shop?.ownerId) {
        await pushNotification({
            shopId,
            userId: shop.ownerId,
            type: 'CHAT',
            title: 'Сообщение от платформы',
            message: snippet || 'Новое сообщение',
            link: '/shop/platform-chat'
        });
    } else if (!isFromPlatform) {
        const admins = await prisma.user.findMany({
            where: {
                role: { in: ['SUPER_ADMIN', 'ADMIN'] },
                isBlocked: false
            },
            select: { id: true }
        });
        for (const admin of admins) {
            await pushNotification({
                userId: admin.id,
                type: 'CHAT',
                title: shop?.name ? `Магазин «${shop.name}»` : 'Сообщение от магазина',
                message: snippet || 'Новое сообщение',
                link: `/super-admin/shop-chats/${shopId}`
            });
        }
    }

    return message;
}

export async function listPlatformConversations(search) {
    const shopWhere = {};
    if (search) {
        shopWhere.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } }
        ];
    }

    const shops = await prisma.shop.findMany({
        where: shopWhere,
        orderBy: { name: 'asc' },
        take: 100,
        select: {
            id: true,
            name: true,
            isVerified: true,
            isSuspended: true,
            owner: { select: { id: true, name: true, email: true } }
        }
    });

    const shopIds = shops.map((s) => s.id);
    const messages = shopIds.length
        ? await prisma.shopPlatformMessage.findMany({
              where: { shopId: { in: shopIds } },
              orderBy: { createdAt: 'desc' }
          })
        : [];

    const lastByShop = new Map();
    const unreadByShop = new Map();

    for (const m of messages) {
        if (!lastByShop.has(m.shopId)) lastByShop.set(m.shopId, m);
        if (!m.isFromPlatform && !m.isRead) {
            unreadByShop.set(m.shopId, (unreadByShop.get(m.shopId) || 0) + 1);
        }
    }

    const items = shops
        .map((shop) => {
            const last = lastByShop.get(shop.id);
            return {
                shopId: shop.id,
                shopName: shop.name,
                isVerified: shop.isVerified,
                isSuspended: shop.isSuspended,
                ownerName: shop.owner?.name,
                ownerEmail: shop.owner?.email,
                lastMessage: last ? previewText(last) : null,
                lastAt: last?.createdAt || null,
                unreadCount: unreadByShop.get(shop.id) || 0,
                hasMessages: Boolean(last)
            };
        })
        .sort((a, b) => {
            if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
            const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
            const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
            return tb - ta;
        });

    return {
        items,
        unreadTotal: items.reduce((s, i) => s + i.unreadCount, 0)
    };
}

export function messageIsMine(msg, userRole) {
    if (isSuperAdminRole(userRole)) return msg.isFromPlatform;
    return !msg.isFromPlatform;
}
