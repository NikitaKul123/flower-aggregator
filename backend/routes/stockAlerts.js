import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireCustomer } from '../middleware/auth.js';
import { isPurchasable } from '../utils/productVisibility.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, requireCustomer);

router.get('/product/:productId', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const productId = Number(req.params.productId);
        const sub = await prisma.stockAlert.findUnique({
            where: { userId_productId: { userId, productId } }
        });
        res.json({ subscribed: !!sub && !sub.notifiedAt });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.post('/product/:productId', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const productId = Number(req.params.productId);

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        if (isPurchasable(product)) {
            return res.status(400).json({ error: 'Товар уже в наличии' });
        }

        await prisma.stockAlert.upsert({
            where: { userId_productId: { userId, productId } },
            create: { userId, productId },
            update: { notifiedAt: null }
        });

        res.json({ success: true, subscribed: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка подписки' });
    }
});

router.delete('/product/:productId', async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const productId = Number(req.params.productId);
        await prisma.stockAlert.deleteMany({
            where: { userId, productId }
        });
        res.json({ success: true, subscribed: false });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

export default router;
