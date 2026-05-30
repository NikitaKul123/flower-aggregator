import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireCustomer } from '../middleware/auth.js';
import { getIo } from '../socket/io.js';
import { pushNotification } from '../services/notificationService.js';
import { validatePromo } from '../utils/promo.js';
import { isPurchasable } from '../utils/productVisibility.js';
import { validateDeliveryChoice, slotLabelById } from '../utils/deliverySlots.js';
import { applyStockAfterSale } from '../utils/productStockRules.js';

const router = Router();
const prisma = new PrismaClient();

router.post('/', authenticateToken, requireCustomer, async (req, res) => {
    try {
        const { items, deliveryInfo, total, promoCode, isPickup } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Корзина пуста' });
        }

        const shopId = Number(items[0]?.shopId);
        if (!shopId) {
            return res.status(400).json({ error: 'Не найден магазин' });
        }

        let subtotal = 0;
        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: Number(item.id) } });
            if (!product || product.shopId !== shopId) {
                return res.status(400).json({ error: `Товар «${item.name}» недоступен` });
            }
            if (!isPurchasable(product)) {
                return res.status(400).json({ error: `«${product.name}» нет в наличии` });
            }
            const qty = Number(item.quantity) || 1;
            if (product.stock != null && product.stock < qty) {
                return res.status(400).json({ error: `Недостаточно «${product.name}» на складе` });
            }
            subtotal += product.price * qty;
        }

        let discount = 0;
        let promoCodeId = null;
        let promoCodeStr = null;

        if (promoCode) {
            const promoResult = await validatePromo(promoCode, shopId, subtotal);
            if (promoResult.error) {
                return res.status(400).json({ error: promoResult.error });
            }
            discount = promoResult.discount;
            promoCodeId = promoResult.promoId;
            promoCodeStr = promoResult.code;
        }

        const finalTotal = subtotal - discount;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) {
            return res.status(400).json({ error: 'Магазин не найден' });
        }

        const deliveryError = validateDeliveryChoice(
            shop,
            deliveryInfo?.deliveryDate,
            deliveryInfo?.deliverySlotId,
            !!isPickup
        );
        if (deliveryError) {
            return res.status(400).json({ error: deliveryError });
        }

        const enrichedDelivery = { ...deliveryInfo };
        if (!isPickup && deliveryInfo?.deliverySlotId) {
            enrichedDelivery.deliverySlotLabel = slotLabelById(
                shop,
                deliveryInfo.deliverySlotId
            );
        }

        const order = await prisma.order.create({
            data: {
                items,
                deliveryInfo: enrichedDelivery,
                total: finalTotal,
                discount,
                promoCode: promoCodeStr,
                promoCodeId,
                shopId,
                userId: Number(req.user.userId),
                status: 'PENDING',
                isPickup: !!isPickup
            }
        });

        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: Number(item.id) } });
            const qty = Number(item.quantity) || 1;
            if (product?.stock != null) {
                await applyStockAfterSale(product.id, qty);
            }
        }

        if (promoCodeId) {
            await prisma.promoCode.update({
                where: { id: promoCodeId },
                data: { usedCount: { increment: 1 } }
            });
        }

        getIo().to(`shop_${shopId}`).emit('new_order', order);

        await prisma.orderStatusHistory.create({
            data: {
                orderId: order.id,
                fromStatus: null,
                toStatus: 'PENDING',
                comment: 'Заказ создан',
                changedByUserId: Number(req.user.userId)
            }
        });

        await pushNotification({
            type: 'ORDER',
            title: `Новый заказ №${order.id}`,
            message: `Сумма ${order.total.toLocaleString('ru-RU')} ₽`,
            link: `/shop/orders?highlight=${order.id}`,
            orderId: order.id,
            groupKey: `order-${order.id}`,
            shopId
        });

        res.status(201).json({
            success: true,
            orderId: order.id,
            message: 'Заказ успешно оформлен'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка создания заказа' });
    }
});

export default router;
