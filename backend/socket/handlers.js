import { PrismaClient } from '@prisma/client';
import { verifySocketToken, resolveSocketShopId, isSuperAdminRole } from '../middleware/auth.js';
import { canAccessOrder } from '../utils/orderAccess.js';
import { ForbiddenError } from '../utils/errors.js';

const prisma = new PrismaClient();

export function registerSocketHandlers(io) {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            socket.user = await verifySocketToken(token);
            socket.shopId = await resolveSocketShopId(socket.user);
            next();
        } catch (e) {
            next(e);
        }
    });

    io.on('connection', (socket) => {
        const { user, shopId } = socket;

        if (isSuperAdminRole(user.role)) {
            socket.join('platform_admin');
        } else if (user.role === 'SHOP_ADMIN') {
            if (!shopId) {
                socket.disconnect(true);
                return;
            }
            socket.join(`shop_${shopId}`);
        } else if (user.role === 'COURIER') {
            if (!shopId) {
                socket.disconnect(true);
                return;
            }
            socket.join(`courier_${user.userId}`);
        } else {
            socket.join(`customer_${user.userId}`);
        }

        socket.on('join_shop', (requestedShopId) => {
            if (user.role !== 'SHOP_ADMIN' || !shopId) return;
            if (Number(requestedShopId) !== Number(shopId)) return;
            socket.join(`shop_${shopId}`);
        });

        socket.on('join_customer', (requestedUserId) => {
            if (user.role === 'SHOP_ADMIN' || user.role === 'COURIER') return;
            if (Number(requestedUserId) !== Number(user.userId)) return;
            socket.join(`customer_${user.userId}`);
        });

        socket.on('join_courier', (requestedUserId) => {
            if (user.role !== 'COURIER') return;
            if (Number(requestedUserId) !== Number(user.userId)) return;
            socket.join(`courier_${user.userId}`);
        });

        socket.on('join_order', async (orderId) => {
            try {
                const id = Number(orderId);
                if (!id) return;

                const order = await prisma.order.findUnique({
                    where: { id },
                    select: { id: true, userId: true, shopId: true }
                });

                if (!canAccessOrder(order, user, shopId)) return;
                socket.join(`order-${id}`);
            } catch (e) {
                console.error('join_order error:', e);
            }
        });

        socket.on('typing_start', async ({ orderId, isShop }) => {
            if (!orderId) return;
            const order = await prisma.order.findUnique({
                where: { id: Number(orderId) },
                select: { userId: true, shopId: true }
            });
            if (!canAccessOrder(order, user, shopId)) return;
            socket.to(`order-${orderId}`).emit('typing', { orderId, isShop });
        });

        socket.on('typing_stop', async ({ orderId, isShop }) => {
            if (!orderId) return;
            const order = await prisma.order.findUnique({
                where: { id: Number(orderId) },
                select: { userId: true, shopId: true }
            });
            if (!canAccessOrder(order, user, shopId)) return;
            socket.to(`order-${orderId}`).emit('typing_stop', { orderId, isShop });
        });
    });
}
