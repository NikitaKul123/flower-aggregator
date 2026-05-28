import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { fetchPublicPromosForShop } from '../utils/promo.js';
import { getShopRatingsMap, attachRatingsToShops } from '../utils/shopRating.js';
import { getShopDeliverySlots } from '../utils/deliverySlots.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/:shopId/promos', async (req, res) => {
    try {
        const promos = await fetchPublicPromosForShop(req.params.shopId);
        res.json(promos);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка загрузки промокодов' });
    }
});

router.get('/:shopId', async (req, res) => {
    try {
        const shopId = Number(req.params.shopId);
        if (!shopId) {
            return res.status(400).json({ error: 'Некорректный id' });
        }
        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop || shop.isSuspended) {
            return res.status(404).json({ error: 'Магазин не найден' });
        }
        const ratingsMap = await getShopRatingsMap([shopId]);
        const [withRating] = attachRatingsToShops([shop], ratingsMap);
        res.json({
            ...withRating,
            deliverySlotOptions: getShopDeliverySlots(withRating)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка получения магазина' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { district, sameDay } = req.query;
        let shops = await prisma.shop.findMany({
            where: { isSuspended: false },
            orderBy: { name: 'asc' }
        });

        if (sameDay === 'true') {
            shops = shops.filter(s => s.sameDayDelivery !== false);
        }

        if (district && String(district).trim()) {
            const q = String(district).trim().toLowerCase();
            shops = shops.filter(s => {
                const districts = Array.isArray(s.serviceDistricts) ? s.serviceDistricts : [];
                if (districts.some(d => String(d).toLowerCase().includes(q))) return true;
                return (s.address || '').toLowerCase().includes(q);
            });
        }

        const ratingsMap = await getShopRatingsMap(shops.map(s => s.id));
        const withRatings = attachRatingsToShops(shops, ratingsMap);
        withRatings.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        res.json(withRatings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка получения магазинов' });
    }
});

export default router;