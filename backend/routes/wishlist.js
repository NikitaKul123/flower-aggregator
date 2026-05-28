import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const items = await prisma.wishlistItem.findMany({
            where: { userId: Number(req.user.userId) },
            include: {
                product: { include: { shop: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(items.map(i => i.product));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка загрузки избранного' });
    }
});

router.post('/toggle/:productId', authenticateToken, async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const productId = Number(req.params.productId);

        const existing = await prisma.wishlistItem.findUnique({
            where: { userId_productId: { userId, productId } }
        });

        if (existing) {
            await prisma.wishlistItem.delete({ where: { id: existing.id } });
            return res.json({ inWishlist: false });
        }

        await prisma.wishlistItem.create({ data: { userId, productId } });
        res.json({ inWishlist: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.delete('/:productId', authenticateToken, async (req, res) => {
    try {
        await prisma.wishlistItem.deleteMany({
            where: {
                userId: Number(req.user.userId),
                productId: Number(req.params.productId)
            }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

export default router;
