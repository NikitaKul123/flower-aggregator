import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, resolveShopAdmin } from '../middleware/auth.js';
import { refreshShopRating } from '../utils/shopRating.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, resolveShopAdmin);

router.get('/', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const reviews = await prisma.orderReview.findMany({
            where: { order: { shopId } },
            include: {
                user: { select: { id: true, name: true } },
                order: { select: { id: true, status: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки отзывов' });
    }
});

router.put('/:id/reply', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const reviewId = Number(req.params.id);
        const text = String(req.body.text || '').trim();

        if (!text) {
            return res.status(400).json({ error: 'Введите текст ответа' });
        }
        if (text.length > 2000) {
            return res.status(400).json({ error: 'Слишком длинный ответ' });
        }

        const existing = await prisma.orderReview.findFirst({
            where: { id: reviewId, order: { shopId } },
            include: { order: { select: { shopId: true } } }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Отзыв не найден' });
        }

        const updated = await prisma.orderReview.update({
            where: { id: reviewId },
            data: { shopReply: text, shopReplyAt: new Date() }
        });

        try {
            await refreshShopRating(shopId);
        } catch (ratingErr) {
            console.warn('refreshShopRating:', ratingErr.message);
        }

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сохранения ответа' });
    }
});

export default router;
