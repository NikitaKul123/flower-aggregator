import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { catalogWhere, attachAvailability } from '../utils/productVisibility.js';
import { getShopRatingsMap, attachRatingsToShops } from '../utils/shopRating.js';
import { namesSimilar } from '../utils/productCompare.js';

async function withShopRatings(products) {
    const shopIds = [...new Set(products.map(p => p.shopId ?? p.shop?.id).filter(Boolean))];
    const ratingsMap = await getShopRatingsMap(shopIds);
    return products.map(p => {
        if (!p.shop) return p;
        const [rated] = attachRatingsToShops([p.shop], ratingsMap);
        return { ...p, shop: rated };
    });
}

const router = Router();

const prisma = new PrismaClient();

/** Все товары витрины всех магазинов */
router.get('/catalog', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: catalogWhere(),
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        rating: true,
                        deliveryTime: true,
                        address: true,
                        sameDayDelivery: true,
                        serviceDistricts: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const rated = await withShopRatings(products);
        res.json(rated.map(attachAvailability));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки каталога' });
    }
});

router.get('/shop/:shopId', async (req, res) => {

    try {

        const shopId = parseInt(req.params.shopId);

        const products = await prisma.product.findMany({
            where: catalogWhere({ shopId }),
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(products.map(attachAvailability));

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Ошибка получения товаров'
        });
    }
});


/** Похожие: та же категория и магазин */
router.get('/:id(\\d+)/similar', async (req, res) => {
    try {
        const productId = Number(req.params.id);
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        const similar = await prisma.product.findMany({
            where: catalogWhere({
                shopId: product.shopId,
                category: product.category,
                id: { not: productId }
            }),
            take: 8,
            orderBy: { createdAt: 'desc' }
        });

        if (similar.length < 4) {
            const extra = await prisma.product.findMany({
                where: catalogWhere({
                    shopId: product.shopId,
                    id: { not: productId, notIn: similar.map(s => s.id) }
                }),
                take: 8 - similar.length,
                orderBy: { price: 'asc' }
            });
            return res.json([...similar, ...extra].map(attachAvailability));
        }

        res.json(similar.map(attachAvailability));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка похожих товаров' });
    }
});

router.get('/:id(\\d+)/recommendations', async (req, res) => {
    try {
        const productId = Number(req.params.id);
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        const addonCategories = ['открытка', 'лента', 'уход', 'аксессуар', 'дополнение'];
        const addons = await prisma.product.findMany({
            where: {
                AND: [
                    catalogWhere({ shopId: product.shopId, id: { not: productId } }),
                    {
                        OR: addonCategories.map(c => ({
                            category: { contains: c, mode: 'insensitive' }
                        }))
                    }
                ]
            },
            take: 4
        });

        let others = [];
        if (addons.length < 4) {
            others = await prisma.product.findMany({
                where: catalogWhere({
                    shopId: product.shopId,
                    id: { not: productId, notIn: addons.map(a => a.id) }
                }),
                take: 4 - addons.length
            });
        }

        res.json([...addons, ...others].map(attachAvailability));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка рекомендаций' });
    }
});

/** Та же позиция (по названию) в других магазинах */
router.get('/:id(\\d+)/price-compare', async (req, res) => {
    try {
        const productId = Number(req.params.id);
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        rating: true,
                        deliveryTime: true,
                        address: true,
                        sameDayDelivery: true
                    }
                }
            }
        });

        if (!product || product.status !== 'ACTIVE') {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        const shopSelect = {
            id: true,
            name: true,
            avatar: true,
            rating: true,
            deliveryTime: true,
            address: true,
            sameDayDelivery: true
        };

        const exactPeers = await prisma.product.findMany({
            where: {
                status: 'ACTIVE',
                id: { not: productId },
                shopId: { not: product.shopId },
                name: { equals: product.name, mode: 'insensitive' }
            },
            include: { shop: { select: shopSelect } },
            orderBy: { price: 'asc' },
            take: 12
        });

        let alternatives = exactPeers;
        let matchType = exactPeers.length ? 'name' : 'none';

        if (!alternatives.length) {
            const candidates = await prisma.product.findMany({
                where: {
                    status: 'ACTIVE',
                    id: { not: productId },
                    shopId: { not: product.shopId },
                    ...(product.category ? { category: product.category } : {})
                },
                include: { shop: { select: shopSelect } },
                orderBy: { price: 'asc' },
                take: 80
            });

            const fuzzy = candidates.filter(p => namesSimilar(p.name, product.name));
            if (fuzzy.length) {
                alternatives = fuzzy.slice(0, 12);
                matchType = 'fuzzy';
            } else if (product.category) {
                alternatives = candidates.slice(0, 8);
                matchType = 'category';
            }
        }

        const ratedPeers = await withShopRatings(alternatives);
        const [baseRated] = await withShopRatings([product]);

        res.json({
            base: attachAvailability(baseRated),
            alternatives: ratedPeers.map(attachAvailability),
            similar: [],
            matchType
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сравнения цен' });
    }
});

router.get('/:id(\\d+)', async (req, res) => {
    try {
        const productId = Number(req.params.id);

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                shop: true
            }
        });

        if (!product || product.status !== 'ACTIVE') {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        const [withRating] = product.shop
            ? await withShopRatings([{ ...product }])
            : [{ ...product }];
        res.json(attachAvailability(withRating));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка получения товара' });
    }
});

export default router;