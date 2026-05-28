import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireCustomer } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, requireCustomer);

router.get('/', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const rows = await prisma.shopSubscription.findMany({
            where: { userId },
            select: { shopId: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ shopIds: rows.map((r) => r.shopId) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки подписок' });
    }
});

router.get('/shop/:shopId', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const shopId = Number(req.params.shopId);
        const sub = await prisma.shopSubscription.findUnique({
            where: { userId_shopId: { userId, shopId } }
        });
        res.json({ subscribed: !!sub });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.post('/shop/:shopId', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const shopId = Number(req.params.shopId);

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) {
            return res.status(404).json({ error: 'Магазин не найден' });
        }

        await prisma.shopSubscription.upsert({
            where: { userId_shopId: { userId, shopId } },
            create: { userId, shopId },
            update: {}
        });

        res.json({ success: true, subscribed: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка подписки' });
    }
});

router.delete('/shop/:shopId', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const shopId = Number(req.params.shopId);
        await prisma.shopSubscription.deleteMany({
            where: { userId, shopId }
        });
        res.json({ success: true, subscribed: false });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

export default router;
