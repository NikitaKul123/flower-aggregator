import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, resolveShopAdmin } from '../middleware/auth.js';
import { saveBase64Image } from '../utils/saveImage.js';
import { syncProductFlags, isPurchasable } from '../utils/productVisibility.js';
import { notifyStockAlerts, wasOutOfStock } from '../services/stockAlertService.js';
import { enforceZeroStockRules } from '../utils/productStockRules.js';
import { notifyIfPublished, notifyShopNewProduct, isNewOnCatalog } from '../services/shopSubscriptionService.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, resolveShopAdmin);

// МОИ ТОВАРЫ

router.post('/upload-image', async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'Нет изображения' });
        const url = saveBase64Image(imageBase64, 'product');
        if (!url) return res.status(400).json({ error: 'Неверный формат (JPEG, PNG, WebP, до 5 МБ)' });
        res.json({ url });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка загрузки' });
    }
});

router.post('/bulk', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const { productIds, action } = req.body;
        if (!Array.isArray(productIds) || !productIds.length) {
            return res.status(400).json({ error: 'Выберите товары' });
        }
        const ids = productIds.map(Number).filter(Boolean);
        const products = await prisma.product.findMany({
            where: { id: { in: ids }, shopId, isTemplate: false }
        });
        let updated = 0;
        for (const product of products) {
            let data = {};
            switch (action) {
                case 'publish':
                    data = syncProductFlags({ status: 'ACTIVE', isOutOfStock: false });
                    break;
                case 'hide':
                    data = syncProductFlags({ status: 'HIDDEN' });
                    break;
                case 'out_of_stock':
                    data = syncProductFlags({ isOutOfStock: true, status: 'ACTIVE' });
                    break;
                // hide применится в enforceZeroStockRules ниже
                case 'in_stock':
                    data = syncProductFlags({ isOutOfStock: false, status: 'ACTIVE' });
                    break;
                default:
                    return res.status(400).json({ error: 'Неизвестное действие' });
            }
            const next = await prisma.product.update({ where: { id: product.id }, data });
            if (wasOutOfStock(product) && isPurchasable(next)) {
                void notifyStockAlerts(next.id);
            }
            void notifyIfPublished(next, product);
            if (action === 'out_of_stock') {
                await enforceZeroStockRules(product.id);
            }
            updated++;
        }
        res.json({ success: true, updated });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка массового действия' });
    }
});

router.get('/my', async (req, res) => {

        try {
            const templatesOnly = req.query.templates === 'true';
            const products =
                await prisma.product.findMany({

                    where: {
                        shopId: Number(req.shopId),
                        isTemplate: templatesOnly ? true : false
                    },

                    include: {
                        shop: true
                    },

                    orderBy: {
                        createdAt: 'desc'
                    }
                });

            res.json(products);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: 'Ошибка получения товаров'
            });
        }
    }
);


// СОЗДАТЬ

router.post('/', async (req, res) => {

        try {

            const {
                name,
                price,
                description,
                image,
                images,
                category,
                status,
                stock,
                isOutOfStock
            } = req.body;

            let imageList = Array.isArray(images)
                ? images.map(s => String(s).trim()).filter(Boolean)
                : [];
            const primary = String(image || '').trim();
            if (!imageList.length && primary) imageList = [primary];
            if (!imageList.length) {
                return res.status(400).json({ error: 'Укажите хотя бы одно изображение' });
            }

            const data = syncProductFlags({
                name,
                price: Number(price),
                description,
                image: imageList[0],
                images: imageList,
                category,
                status: status || 'DRAFT',
                stock: stock != null && stock !== '' ? Number(stock) : null,
                isOutOfStock: !!isOutOfStock,
                isTemplate: !!req.body.isTemplate,
                shopId: Number(req.shopId)
            });

            const product = await prisma.product.create({ data });

            if (isNewOnCatalog(product)) {
                void notifyShopNewProduct(product);
            }

            res.status(201)
                .json(product);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    'Ошибка создания товара'
            });
        }
    }
);


// ОБНОВИТЬ

router.put('/:id', async (req, res) => {
    try {

        const id =
            Number(req.params.id);

        const {
            name,
            price,
            description,
            image,
            images,
            category,
            status,
            stock,
            isOutOfStock
        } = req.body;

        const product = await prisma.product.findFirst({
            where: { id, shopId: Number(req.shopId) }
        });

        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        let imageList = Array.isArray(images)
            ? images.map(s => String(s).trim()).filter(Boolean)
            : [];
        const primary = String(image || '').trim();
        if (!imageList.length && primary) imageList = [primary];
        if (!imageList.length) {
            imageList = product.images?.length ? product.images : [product.image];
        }

        const data = syncProductFlags({
            name,
            price: Number(price),
            description,
            image: imageList[0],
            images: imageList,
            category,
            status: status ?? product.status,
            stock: stock != null && stock !== '' ? Number(stock) : null,
            isOutOfStock: isOutOfStock != null ? !!isOutOfStock : product.isOutOfStock
        });

        let updated = await prisma.product.update({ where: { id }, data });

        const newStock = updated.stock;
        if (newStock != null && newStock <= 0) {
            updated = await enforceZeroStockRules(id, {
                wasAtZero: product.stock != null && product.stock <= 0
            });
        } else if (updated.isOutOfStock && updated.stock == null) {
            updated = await enforceZeroStockRules(id, { wasAtZero: !!product.isOutOfStock });
        } else if (wasOutOfStock(product) && isPurchasable(updated)) {
            void notifyStockAlerts(updated.id);
        }

        void notifyIfPublished(updated, product);

        res.json(updated);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                'Ошибка обновления товара'
        });
    }
});


router.post('/:id/duplicate', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const shopId = Number(req.shopId);
        const source = await prisma.product.findFirst({ where: { id, shopId } });
        if (!source) return res.status(404).json({ error: 'Товар не найден' });

        const asTemplate = !!req.body.asTemplate;
        const publish = !!req.body.publish;

        const copy = await prisma.product.create({
            data: syncProductFlags({
                name: req.body.name?.trim() || `${source.name}${asTemplate ? '' : ' (копия)'}`,
                price: source.price,
                description: source.description,
                image: source.image,
                images: source.images?.length ? source.images : [source.image],
                category: source.category,
                stock: source.stock,
                isOutOfStock: false,
                isTemplate: asTemplate,
                status: publish && !asTemplate ? 'ACTIVE' : 'DRAFT',
                shopId
            })
        });

        if (isNewOnCatalog(copy)) {
            void notifyShopNewProduct(copy);
        }

        res.status(201).json(copy);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка дублирования' });
    }
});

router.patch('/:id/quick', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const shopId = Number(req.shopId);
        const product = await prisma.product.findFirst({ where: { id, shopId } });
        if (!product) return res.status(404).json({ error: 'Товар не найден' });

        const { action } = req.body;
        let data = {};

        switch (action) {
            case 'publish':
                data = syncProductFlags({ status: 'ACTIVE', isOutOfStock: false });
                break;
            case 'hide':
                data = syncProductFlags({ status: 'HIDDEN' });
                break;
            case 'draft':
                data = syncProductFlags({ status: 'DRAFT' });
                break;
            case 'out_of_stock':
                data = syncProductFlags({ isOutOfStock: true, status: 'ACTIVE' });
                break;
            case 'in_stock':
                data = syncProductFlags({ isOutOfStock: false, status: 'ACTIVE' });
                break;
            default:
                return res.status(400).json({ error: 'Неизвестное действие' });
        }

        let updated = await prisma.product.update({ where: { id }, data });
        if (action === 'out_of_stock') {
            updated = await enforceZeroStockRules(id, { wasAtZero: isAtZero(product) });
        } else if (action === 'in_stock' && wasOutOfStock(product) && isPurchasable(updated)) {
            void notifyStockAlerts(updated.id);
        }
        void notifyIfPublished(updated, product);
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка' });
    }
});

function isAtZero(p) {
    if (p.stock != null) return p.stock <= 0;
    return !!p.isOutOfStock;
}

router.delete('/:id', async (req, res) => {
    try {

        const id =
            Number(
                req.params.id
            );

        const product =
            await prisma.product.findFirst({

                where: {
                    id,
                    shopId:
                        Number(
                            req.shopId
                        )
                }
            });

        if (!product) {
            return res.status(404).json({
                error:
                    'Товар не найден'
            });
        }

        await prisma.product.delete({
            where: {
                id
            }
        });

        res.json({
            success: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                'Ошибка удаления товара'
        });
    }
});

export default router;