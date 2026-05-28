import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, resolveShopAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, resolveShopAdmin);

/** Клиенты магазина (с заказами) + CRM */
router.get('/customers', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const orders = await prisma.order.findMany({
            where: { shopId },
            select: { userId: true, total: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });

        const byUser = new Map();
        for (const o of orders) {
            if (!byUser.has(o.userId)) {
                byUser.set(o.userId, {
                    userId: o.userId,
                    ordersCount: 0,
                    totalSpent: 0,
                    lastOrderAt: o.createdAt
                });
            }
            const row = byUser.get(o.userId);
            row.ordersCount += 1;
            row.totalSpent += o.total;
            if (new Date(o.createdAt) > new Date(row.lastOrderAt)) {
                row.lastOrderAt = o.createdAt;
            }
        }

        const userIds = [...byUser.keys()];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true, phone: true }
        });
        const crmRows = await prisma.shopCustomerCRM.findMany({
            where: { shopId, userId: { in: userIds } }
        });
        const crmMap = new Map(crmRows.map(c => [c.userId, c]));

        const list = users
            .map(u => ({
                ...u,
                ...byUser.get(u.id),
                tags: crmMap.get(u.id)?.tags || [],
                notes: crmMap.get(u.id)?.notes || ''
            }))
            .sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt));

        res.json(list);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка загрузки клиентов' });
    }
});

router.get('/customers/:userId', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const userId = Number(req.params.userId);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, phone: true }
        });
        if (!user) return res.status(404).json({ error: 'Клиент не найден' });

        const crm = await prisma.shopCustomerCRM.findUnique({
            where: { shopId_userId: { shopId, userId } }
        });

        const orders = await prisma.order.findMany({
            where: { shopId, userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { id: true, status: true, total: true, createdAt: true }
        });

        res.json({ user, tags: crm?.tags || [], notes: crm?.notes || '', orders });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.put('/customers/:userId', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const userId = Number(req.params.userId);
        const tags = Array.isArray(req.body.tags)
            ? req.body.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 20)
            : undefined;
        const notes =
            req.body.notes !== undefined ? String(req.body.notes).trim().slice(0, 5000) : undefined;

        const crm = await prisma.shopCustomerCRM.upsert({
            where: { shopId_userId: { shopId, userId } },
            create: {
                shopId,
                userId,
                tags: tags || [],
                notes: notes ?? ''
            },
            update: {
                ...(tags !== undefined && { tags }),
                ...(notes !== undefined && { notes })
            }
        });
        res.json(crm);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

export default router;
