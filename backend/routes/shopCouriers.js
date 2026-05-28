import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, resolveShopAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, resolveShopAdmin);

router.get('/', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const couriers = await prisma.shopCourier.findMany({
            where: { shopId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true, avatar: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const activeCounts = await prisma.order.groupBy({
            by: ['courierId'],
            where: {
                shopId,
                courierId: { not: null },
                status: { in: ['READY', 'DELIVERING'] }
            },
            _count: { _all: true }
        });
        const countMap = new Map(activeCounts.map(c => [c.courierId, c._count._all]));

        res.json(
            couriers.map(c => ({
                id: c.id,
                userId: c.userId,
                isActive: c.isActive,
                activeDeliveries: countMap.get(c.userId) || 0,
                user: c.user
            }))
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки курьеров' });
    }
});

router.post('/', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const { email, password, name, phone } = req.body;

        if (!email?.trim() || !password || !name?.trim()) {
            return res.status(400).json({ error: 'Укажите email, пароль и имя' });
        }

        const emailClean = email.trim().toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email: emailClean } });
        if (existing) {
            return res.status(400).json({ error: 'Email уже используется' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email: emailClean,
                password: hashed,
                name: name.trim(),
                phone: phone?.trim() || null,
                role: 'COURIER'
            }
        });

        const link = await prisma.shopCourier.create({
            data: { shopId, userId: user.id },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } }
            }
        });

        res.status(201).json(link);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка создания курьера' });
    }
});

router.patch('/:userId', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const userId = Number(req.params.userId);
        const { isActive } = req.body;

        const link = await prisma.shopCourier.findFirst({
            where: { shopId, userId }
        });
        if (!link) {
            return res.status(404).json({ error: 'Курьер не найден' });
        }

        const updated = await prisma.shopCourier.update({
            where: { id: link.id },
            data: { isActive: !!isActive },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } }
            }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

export default router;
