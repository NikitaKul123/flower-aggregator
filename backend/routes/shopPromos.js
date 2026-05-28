import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, resolveShopAdmin, requireCustomer } from '../middleware/auth.js';
import { validatePromo, fetchPublicPromosForShop } from '../utils/promo.js';
import { notifyShopPromo } from '../services/shopSubscriptionService.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/public/:shopId', async (req, res) => {
    try {
        const active = await fetchPublicPromosForShop(req.params.shopId);
        res.json(active);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка загрузки промокодов' });
    }
});

router.post('/validate', authenticateToken, requireCustomer, async (req, res) => {
    try {
        const { code, shopId, subtotal } = req.body;
        const result = await validatePromo(
            code,
            Number(shopId),
            Number(subtotal) || 0
        );
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка проверки' });
    }
});

router.use(authenticateToken, resolveShopAdmin);

router.get('/', async (req, res) => {
    try {
        const list = await prisma.promoCode.findMany({
            where: { shopId: Number(req.shopId) },
            orderBy: { createdAt: 'desc' }
        });
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка загрузки' });
    }
});

router.post('/', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const {
            code,
            description,
            discountType,
            discountValue,
            minOrder,
            maxUses,
            validFrom,
            validTo,
            isActive,
            notifySubscribers
        } = req.body;

        if (!code?.trim()) return res.status(400).json({ error: 'Укажите код' });
        if (!['PERCENT', 'FIXED'].includes(discountType)) {
            return res.status(400).json({ error: 'Неверный тип скидки' });
        }

        const created = await prisma.promoCode.create({
            data: {
                shopId,
                code: code.trim().toUpperCase(),
                description: description?.trim() || null,
                discountType,
                discountValue: Number(discountValue),
                minOrder: Number(minOrder) || 0,
                maxUses: maxUses != null ? Number(maxUses) : null,
                validFrom: validFrom ? new Date(validFrom) : null,
                validTo: validTo ? new Date(validTo) : null,
                isActive: isActive !== false
            }
        });
        if (created.isActive && notifySubscribers !== false) {
            const shop = await prisma.shop.findUnique({
                where: { id: shopId },
                select: { id: true, name: true }
            });
            void notifyShopPromo(created, shop);
        }
        res.status(201).json(created);
    } catch (e) {
        if (e.code === 'P2002') return res.status(400).json({ error: 'Такой код уже есть' });
        console.error(e);
        res.status(500).json({ error: 'Ошибка создания' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const shopId = Number(req.shopId);
        const existing = await prisma.promoCode.findFirst({ where: { id, shopId } });
        if (!existing) return res.status(404).json({ error: 'Не найдено' });

        const data = { ...req.body };
        if (data.code) data.code = String(data.code).trim().toUpperCase();
        if (data.discountValue != null) data.discountValue = Number(data.discountValue);
        if (data.minOrder != null) data.minOrder = Number(data.minOrder);
        if (data.maxUses != null) data.maxUses = Number(data.maxUses);
        if (data.validFrom) data.validFrom = new Date(data.validFrom);
        if (data.validTo) data.validTo = new Date(data.validTo);

        const updated = await prisma.promoCode.update({ where: { id }, data });
        if (req.body.notifySubscribers && updated.isActive) {
            const shop = await prisma.shop.findUnique({
                where: { id: shopId },
                select: { id: true, name: true }
            });
            void notifyShopPromo(updated, shop);
        }
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const shopId = Number(req.shopId);
        const existing = await prisma.promoCode.findFirst({ where: { id, shopId } });
        if (!existing) return res.status(404).json({ error: 'Не найдено' });
        await prisma.promoCode.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

export default router;
