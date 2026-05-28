import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, isSuperAdminRole, requireSuperAdmin } from '../middleware/auth.js';
import { ORDER_STATUS_LABELS } from '../utils/orderStatusLabels.js';
import { logAdminAudit } from '../utils/adminAudit.js';
import { generateTempPassword } from '../utils/userBlock.js';
import {
    buildLastByChannel,
    needsReply,
    previewText
} from '../utils/chatDisputes.js';

const router = Router();
const prisma = new PrismaClient();

const actorId = (req) => Number(req.user.userId);

router.use(authenticateToken, requireSuperAdmin);

router.get('/dashboard', async (req, res) => {
    try {
        const [
            usersCount,
            shopsCount,
            ordersCount,
            productsCount,
            couriersCount,
            pendingShopsCount,
            revenueAgg,
            recentOrders,
            ordersByStatus
        ] = await Promise.all([
            prisma.user.count(),
            prisma.shop.count(),
            prisma.order.count(),
            prisma.product.count(),
            prisma.shopCourier.count({ where: { isActive: true } }),
            prisma.shop.count({ where: { isVerified: false, isSuspended: false } }),
            prisma.order.aggregate({
                where: { status: { not: 'CANCELLED' } },
                _sum: { total: true }
            }),
            prisma.order.findMany({
                take: 8,
                orderBy: { createdAt: 'desc' },
                include: {
                    shop: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true, email: true } }
                }
            }),
            prisma.order.groupBy({
                by: ['status'],
                _count: { _all: true }
            })
        ]);

        res.json({
            usersCount,
            shopsCount,
            ordersCount,
            productsCount,
            couriersCount,
            pendingShopsCount,
            revenueTotal: revenueAgg._sum.total || 0,
            recentOrders,
            ordersByStatus: ordersByStatus.map((r) => ({
                status: r.status,
                label: ORDER_STATUS_LABELS[r.status] || r.status,
                count: r._count._all
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки статистики' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const search = (req.query.search || '').trim();
        const role = req.query.role;

        const where = {};
        if (role && role !== 'ALL') where.role = role;
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ];
        }

        const users = await prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isBlocked: true,
                blockedAt: true,
                blockedReason: true,
                createdAt: true,
                shop: { select: { id: true, name: true } },
                shopCourier: {
                    select: {
                        isActive: true,
                        shop: { select: { id: true, name: true } }
                    }
                },
                _count: { select: { orders: true } }
            }
        });

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки пользователей' });
    }
});

router.patch('/users/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { role, name, phone, newPassword, isBlocked, blockedReason } = req.body;

        if (id === Number(req.user.userId) && role && !isSuperAdminRole(role)) {
            return res.status(400).json({ error: 'Нельзя снять с себя роль супер-админа' });
        }
        if (id === Number(req.user.userId) && isBlocked === true) {
            return res.status(400).json({ error: 'Нельзя заблокировать свой аккаунт' });
        }

        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

        if (isBlocked === true && isSuperAdminRole(target.role)) {
            const superCount = await prisma.user.count({
                where: {
                    role: { in: ['SUPER_ADMIN', 'ADMIN'] },
                    isBlocked: false,
                    id: { not: id }
                }
            });
            if (superCount < 1) {
                return res.status(400).json({ error: 'Нельзя заблокировать последнего активного супер-админа' });
            }
        }

        const data = {};
        if (name != null) data.name = String(name).trim();
        if (phone != null) data.phone = phone ? String(phone).trim() : null;
        if (isBlocked !== undefined) {
            data.isBlocked = Boolean(isBlocked);
            data.blockedAt = isBlocked ? new Date() : null;
            data.blockedReason = isBlocked
                ? blockedReason
                    ? String(blockedReason).trim()
                    : null
                : null;
        } else if (blockedReason !== undefined && target.isBlocked) {
            data.blockedReason = blockedReason ? String(blockedReason).trim() : null;
        }
        if (role) {
            const allowed = ['CUSTOMER', 'SHOP_ADMIN', 'COURIER', 'SUPER_ADMIN', 'ADMIN'];
            if (!allowed.includes(role)) {
                return res.status(400).json({ error: 'Недопустимая роль' });
            }
            data.role = role;
        }
        if (newPassword?.length >= 6) {
            data.password = await bcrypt.hash(newPassword, 10);
        }

        const updated = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isBlocked: true,
                blockedAt: true,
                blockedReason: true,
                createdAt: true
            }
        });

        const auditAction =
            isBlocked === true
                ? 'USER_BLOCK'
                : isBlocked === false
                  ? 'USER_UNBLOCK'
                  : 'USER_UPDATE';

        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: auditAction,
            entityType: 'USER',
            entityId: id,
            message: `Обновлён пользователь #${id}`,
            meta: { role: updated.role, fields: Object.keys(data) }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка обновления пользователя' });
    }
});

router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const id = Number(req.params.id);
        let newPassword = req.body.newPassword ? String(req.body.newPassword) : null;
        const generate = req.body.generate !== false && !newPassword;

        if (newPassword && newPassword.length < 6) {
            return res.status(400).json({ error: 'Пароль минимум 6 символов' });
        }
        if (generate) {
            newPassword = generateTempPassword(12);
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        await prisma.user.update({
            where: { id },
            data: { password: await bcrypt.hash(newPassword, 10) }
        });

        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: 'USER_PASSWORD_RESET',
            entityType: 'USER',
            entityId: id,
            message: `Сброс пароля: ${user.email}`,
            meta: { generated: generate }
        });

        res.json({
            success: true,
            temporaryPassword: generate ? newPassword : undefined
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сброса пароля' });
    }
});

router.get('/chats', async (req, res) => {
    try {
        const filter = String(req.query.filter || 'all');
        const search = (req.query.search || '').trim();
        const since = new Date();
        since.setDate(since.getDate() - 90);

        const orderWhere = {
            messages: { some: {} },
            createdAt: { gte: since }
        };

        if (search) {
            const idNum = Number(search);
            orderWhere.OR = [
                ...(Number.isFinite(idNum) ? [{ id: idNum }] : []),
                { shop: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { user: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const orders = await prisma.order.findMany({
            where: orderWhere,
            take: 120,
            orderBy: { updatedAt: 'desc' },
            include: {
                shop: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true } },
                courier: { select: { id: true, name: true } }
            }
        });

        const orderIds = orders.map((o) => o.id);
        const allMessages = orderIds.length
            ? await prisma.message.findMany({
                  where: { orderId: { in: orderIds } },
                  orderBy: { createdAt: 'desc' }
              })
            : [];

        const lastByChannel = buildLastByChannel(allMessages);

        let items = orders.map((o) => {
            const lastShop = lastByChannel.get(`${o.id}:SHOP`);
            const lastCourier = lastByChannel.get(`${o.id}:COURIER`);
            const shopNoReply = needsReply(lastShop, 'shop');
            const courierNoReply =
                Boolean(o.courierId) && !o.isPickup && needsReply(lastCourier, 'courier');

            const lastAny = [lastShop, lastCourier]
                .filter(Boolean)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

            return {
                orderId: o.id,
                status: o.status,
                shopId: o.shop?.id,
                shopName: o.shop?.name,
                customerName: o.user?.name,
                customerEmail: o.user?.email,
                courierName: o.courier?.name || null,
                lastMessage: previewText(lastAny),
                lastAt: lastAny?.createdAt || o.updatedAt,
                shopNoReply,
                courierNoReply,
                hasDispute: shopNoReply || courierNoReply
            };
        });

        if (filter === 'shop_no_reply') {
            items = items.filter((i) => i.shopNoReply);
        } else if (filter === 'courier_no_reply') {
            items = items.filter((i) => i.courierNoReply);
        } else if (filter === 'disputes') {
            items = items.filter((i) => i.hasDispute);
        }

        items.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

        res.json({
            items,
            counts: {
                total: items.length,
                shopNoReply: items.filter((i) => i.shopNoReply).length,
                courierNoReply: items.filter((i) => i.courierNoReply).length
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки чатов' });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (id === Number(req.user.userId)) {
            return res.status(400).json({ error: 'Нельзя удалить свой аккаунт' });
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (isSuperAdminRole(user.role)) {
            const superCount = await prisma.user.count({
                where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } }
            });
            if (superCount <= 1) {
                return res.status(400).json({ error: 'Нельзя удалить последнего супер-админа' });
            }
        }

        const victim = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
        await prisma.user.delete({ where: { id } });
        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: 'USER_DELETE',
            entityType: 'USER',
            entityId: id,
            message: `Удалён пользователь ${victim?.email || id}`,
            meta: { role: victim?.role }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

router.get('/shops', async (req, res) => {
    try {
        const search = (req.query.search || '').trim();
        const moderation = req.query.moderation;

        const where = {};
        if (moderation === 'pending') {
            where.isVerified = false;
            where.isSuspended = false;
        } else if (moderation === 'suspended') {
            where.isSuspended = true;
        } else if (moderation === 'verified') {
            where.isVerified = true;
            where.isSuspended = false;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } }
            ];
        }

        const shops = await prisma.shop.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                owner: { select: { id: true, email: true, name: true } },
                _count: { select: { products: true, orders: true, couriers: true } }
            }
        });

        res.json(shops);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки магазинов' });
    }
});

router.patch('/shops/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isVerified, isSuspended, name, address, phone, autoHideZeroStock } = req.body;

        const data = {};
        if (typeof isVerified === 'boolean') data.isVerified = isVerified;
        if (typeof isSuspended === 'boolean') data.isSuspended = isSuspended;
        if (name != null) data.name = String(name).trim();
        if (address != null) data.address = String(address).trim();
        if (phone != null) data.phone = phone ? String(phone).trim() : null;
        if (typeof autoHideZeroStock === 'boolean') data.autoHideZeroStock = autoHideZeroStock;

        const updated = await prisma.shop.update({
            where: { id },
            data,
            include: {
                owner: { select: { id: true, email: true, name: true } },
                _count: { select: { products: true, orders: true } }
            }
        });

        let action = 'SHOP_UPDATE';
        let message = `Обновлён магазин «${updated.name}»`;
        if (typeof isVerified === 'boolean') {
            action = isVerified ? 'SHOP_APPROVE' : 'SHOP_UNVERIFY';
            message = isVerified ? `Магазин «${updated.name}» одобрен` : `Снята проверка с «${updated.name}»`;
        }
        if (typeof isSuspended === 'boolean') {
            action = isSuspended ? 'SHOP_SUSPEND' : 'SHOP_UNSUSPEND';
            message = isSuspended ? `Магазин «${updated.name}» отключён` : `Магазин «${updated.name}» включён`;
        }

        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action,
            entityType: 'SHOP',
            entityId: id,
            message,
            meta: data
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка обновления магазина' });
    }
});

router.delete('/shops/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const shop = await prisma.shop.findUnique({ where: { id }, select: { name: true } });
        await prisma.shop.delete({ where: { id } });
        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: 'SHOP_DELETE',
            entityType: 'SHOP',
            entityId: id,
            message: `Удалён магазин «${shop?.name || id}»`
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка удаления магазина' });
    }
});

router.get('/orders', async (req, res) => {
    try {
        const status = req.query.status;
        const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
        const search = (req.query.search || '').trim();

        const where = {};
        if (status && status !== 'ALL') where.status = status;
        if (shopId) where.shopId = shopId;

        let orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 150,
            include: {
                shop: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true, phone: true } },
                courier: { select: { id: true, name: true } }
            }
        });

        if (search) {
            const s = search.toLowerCase();
            orders = orders.filter(
                (o) =>
                    String(o.id).includes(s)
                    || o.user?.name?.toLowerCase().includes(s)
                    || o.user?.email?.toLowerCase().includes(s)
                    || o.shop?.name?.toLowerCase().includes(s)
            );
        }

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
});

router.put('/orders/:id/status', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status, comment } = req.body;
        if (!status) return res.status(400).json({ error: 'Укажите status' });

        const order = await prisma.order.findUnique({ where: { id } });
        if (!order) return res.status(404).json({ error: 'Заказ не найден' });

        const updated = await prisma.order.update({
            where: { id },
            data: { status }
        });

        await prisma.orderStatusHistory.create({
            data: {
                orderId: id,
                fromStatus: order.status,
                toStatus: status,
                comment: comment?.trim() || 'Изменено супер-админом',
                changedByUserId: actorId(req)
            }
        });

        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: 'ORDER_STATUS',
            entityType: 'ORDER',
            entityId: id,
            message: `Заказ №${id}: ${ORDER_STATUS_LABELS[order.status] || order.status} → ${ORDER_STATUS_LABELS[status] || status}`,
            meta: { fromStatus: order.status, toStatus: status }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
});

router.get('/orders/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                shop: { select: { id: true, name: true, address: true, phone: true } },
                user: { select: { id: true, name: true, email: true, phone: true } },
                courier: { select: { id: true, name: true, phone: true, email: true } },
                review: true,
                statusHistory: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        changedBy: { select: { id: true, name: true, role: true } }
                    }
                }
            }
        });
        if (!order) return res.status(404).json({ error: 'Заказ не найден' });
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки заказа' });
    }
});

router.get('/orders/:id/messages', async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const channel = String(req.query.channel || 'SHOP').toUpperCase();
        const messages = await prisma.message.findMany({
            where: { orderId, channel },
            orderBy: { createdAt: 'asc' },
            take: 200,
            include: {
                user: { select: { id: true, name: true, role: true } }
            }
        });
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки чата' });
    }
});

router.get('/reviews', async (req, res) => {
    try {
        const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
        const reviews = await prisma.orderReview.findMany({
            where: shopId ? { order: { shopId } } : {},
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                user: { select: { id: true, name: true, email: true } },
                order: {
                    select: {
                        id: true,
                        shop: { select: { id: true, name: true } }
                    }
                }
            }
        });
        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки отзывов' });
    }
});

router.delete('/reviews/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const review = await prisma.orderReview.findUnique({
            where: { id },
            include: { order: { select: { shopId: true } } }
        });
        if (!review) return res.status(404).json({ error: 'Отзыв не найден' });
        await prisma.orderReview.delete({ where: { id } });
        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: 'REVIEW_DELETE',
            entityType: 'REVIEW',
            entityId: id,
            message: `Удалён отзыв к заказу №${review.orderId}`,
            meta: { shopId: review.order?.shopId, rating: review.rating }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка удаления отзыва' });
    }
});

router.delete('/reviews/:id/reply', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const review = await prisma.orderReview.update({
            where: { id },
            data: { shopReply: null, shopReplyAt: null }
        });
        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: 'REVIEW_REPLY_DELETE',
            entityType: 'REVIEW',
            entityId: id,
            message: `Удалён ответ магазина на отзыв #${id}`
        });
        res.json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.get('/couriers', async (req, res) => {
    try {
        const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
        const couriers = await prisma.shopCourier.findMany({
            where: shopId ? { shopId } : {},
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                shop: { select: { id: true, name: true } }
            }
        });
        res.json(couriers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки курьеров' });
    }
});

router.patch('/couriers/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const { isActive } = req.body;
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'Укажите isActive' });
        }
        const updated = await prisma.shopCourier.update({
            where: { userId },
            data: { isActive },
            include: {
                user: { select: { id: true, name: true, email: true } },
                shop: { select: { id: true, name: true } }
            }
        });
        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: isActive ? 'COURIER_ENABLE' : 'COURIER_DISABLE',
            entityType: 'COURIER',
            entityId: userId,
            message: `Курьер ${updated.user?.name || userId} ${isActive ? 'включён' : 'отключён'} (${updated.shop?.name})`
        });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка обновления курьера' });
    }
});

router.get('/promos', async (req, res) => {
    try {
        const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
        const promos = await prisma.promoCode.findMany({
            where: shopId ? { shopId } : {},
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                shop: { select: { id: true, name: true } }
            }
        });
        res.json(promos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки промокодов' });
    }
});

router.patch('/promos/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isActive } = req.body;
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'Укажите isActive' });
        }
        const updated = await prisma.promoCode.update({
            where: { id },
            data: { isActive },
            include: { shop: { select: { id: true, name: true } } }
        });
        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: isActive ? 'PROMO_ENABLE' : 'PROMO_DISABLE',
            entityType: 'PROMO',
            entityId: id,
            message: `Промо ${updated.code} (${updated.shop?.name}) ${isActive ? 'включён' : 'отключён'}`
        });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка обновления промо' });
    }
});

router.get('/audit-log', async (req, res) => {
    try {
        const take = Math.min(Number(req.query.limit) || 100, 300);
        const logs = await prisma.adminAuditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take,
            include: {
                actor: { select: { id: true, name: true, email: true, role: true } }
            }
        });
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки журнала' });
    }
});

router.get('/products', async (req, res) => {
    try {
        const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
        const search = (req.query.search || '').trim();

        const where = {};
        if (shopId) where.shopId = shopId;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } }
            ];
        }

        const products = await prisma.product.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            take: 200,
            include: {
                shop: { select: { id: true, name: true } }
            }
        });

        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки товаров' });
    }
});

router.patch('/products/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status, isActive, isOutOfStock } = req.body;
        const data = {};
        if (status) data.status = status;
        if (typeof isActive === 'boolean') data.isActive = isActive;
        if (typeof isOutOfStock === 'boolean') data.isOutOfStock = isOutOfStock;

        const updated = await prisma.product.update({
            where: { id },
            data,
            include: { shop: { select: { id: true, name: true } } }
        });

        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: 'PRODUCT_UPDATE',
            entityType: 'PRODUCT',
            entityId: id,
            message: `Обновлён товар «${updated.name}»`,
            meta: data
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка обновления товара' });
    }
});

export default router;
