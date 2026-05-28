import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireCustomer } from '../middleware/auth.js';
import { refreshShopRating } from '../utils/shopRating.js';

const router = Router();
const prisma = new PrismaClient();

function orderContainsProduct(order, productId) {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.some(i => Number(i.id) === Number(productId));
}

/** Отзывы по товару (из доставленных заказов) */
router.get('/products/:productId', async (req, res) => {
    try {
        const productId = Number(req.params.productId);
        const reviews = await prisma.orderReview.findMany({
            where: { order: { status: 'DELIVERED' } },
            include: {
                user: { select: { id: true, name: true } },
                order: { select: { id: true, items: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const list = reviews
            .filter(r => orderContainsProduct(r.order, productId))
            .map(r => ({
                id: r.id,
                rating: r.rating,
                text: r.text,
                shopReply: r.shopReply,
                shopReplyAt: r.shopReplyAt,
                createdAt: r.createdAt,
                userName: r.user?.name || 'Покупатель',
                orderId: r.orderId
            }));

        res.json(list);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки отзывов' });
    }
});

router.post('/orders/:orderId', authenticateToken, requireCustomer, async (req, res) => {
    try {
        const orderId = Number(req.params.orderId);
        const userId = Number(req.user.userId);
        const rating = Number(req.body.rating);
        const text = String(req.body.text || '').trim();

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Укажите оценку от 1 до 5' });
        }

        const order = await prisma.order.findFirst({
            where: { id: orderId, userId }
        });
        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        if (order.status !== 'DELIVERED') {
            return res.status(400).json({ error: 'Отзыв можно оставить после доставки' });
        }

        const existing = await prisma.orderReview.findUnique({ where: { orderId } });
        if (existing) {
            return res.status(400).json({ error: 'Отзыв по этому заказу уже оставлен' });
        }

        const review = await prisma.orderReview.create({
            data: { orderId, userId, rating, text: text || null }
        });

        await refreshShopRating(order.shopId);

        res.status(201).json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сохранения отзыва' });
    }
});

export default router;
