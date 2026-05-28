import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, resolveShopAdmin } from '../middleware/auth.js';
import { saveBase64Image } from '../utils/saveImage.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, resolveShopAdmin);

router.get('/', async (req, res) => {
    try {
        const shop = await prisma.shop.findFirst({
            where: { id: Number(req.shopId) },
            include: {
                owner: { select: { id: true, email: true, name: true, phone: true } }
            }
        });
        if (!shop) return res.status(404).json({ error: 'Магазин не найден' });
        res.json(shop);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка загрузки' });
    }
});

router.put('/', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const {
            name,
            address,
            phone,
            deliveryTime,
            sameDayDelivery,
            serviceDistricts,
            deliverySlots,
            maxDeliveryDays,
            autoHideZeroStock
        } = req.body;
        const shop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                ...(name != null && { name: String(name).trim() }),
                ...(address != null && { address: String(address).trim() }),
                ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
                ...(deliveryTime != null && { deliveryTime: String(deliveryTime).trim() }),
                ...(sameDayDelivery !== undefined && { sameDayDelivery: !!sameDayDelivery }),
                ...(serviceDistricts !== undefined && {
                    serviceDistricts: Array.isArray(serviceDistricts)
                        ? serviceDistricts.map(d => String(d).trim()).filter(Boolean)
                        : []
                }),
                ...(deliverySlots !== undefined && { deliverySlots }),
                ...(maxDeliveryDays !== undefined && {
                    maxDeliveryDays: Math.min(14, Math.max(1, Number(maxDeliveryDays) || 7))
                }),
                ...(autoHideZeroStock !== undefined && { autoHideZeroStock: !!autoHideZeroStock })
            }
        });
        res.json(shop);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

router.put('/avatar', async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'Нет изображения' });
        const avatar = saveBase64Image(imageBase64, 'avatar-shop');
        if (!avatar) return res.status(400).json({ error: 'Неверный формат' });

        const shop = await prisma.shop.update({
            where: { id: Number(req.shopId) },
            data: { avatar }
        });
        res.json(shop);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Ошибка загрузки' });
    }
});

export default router;
