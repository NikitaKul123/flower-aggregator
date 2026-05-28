import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireCustomer } from '../middleware/auth.js';
import { getShopRatingsMap, attachRatingsToShops } from '../utils/shopRating.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, requireCustomer);

router.get('/', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const items = await prisma.shopFavorite.findMany({
            where: { userId },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        avatar: true,
                        rating: true,
                        deliveryTime: true,
                        isVerified: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const shops = items.map((i) => i.shop);
        const ratingsMap = await getShopRatingsMap(shops.map((s) => s.id));
        res.json(attachRatingsToShops(shops, ratingsMap));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки избранного' });
    }
});

router.get('/ids', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const rows = await prisma.shopFavorite.findMany({
            where: { userId },
            select: { shopId: true }
        });
        res.json({ shopIds: rows.map((r) => r.shopId) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.post('/toggle/:shopId', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const shopId = Number(req.params.shopId);

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) {
            return res.status(404).json({ error: 'Магазин не найден' });
        }

        const existing = await prisma.shopFavorite.findUnique({
            where: { userId_shopId: { userId, shopId } }
        });

        if (existing) {
            await prisma.shopFavorite.delete({ where: { id: existing.id } });
            return res.json({ favorite: false });
        }

        await prisma.shopFavorite.create({ data: { userId, shopId } });
        res.json({ favorite: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

export default router;
