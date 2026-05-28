import { PrismaClient } from '@prisma/client';
import { getIo } from '../socket/io.js';
import { pushNotification } from './notificationService.js';

const prisma = new PrismaClient();

export function isNewOnCatalog(product) {
    return product?.status === 'ACTIVE';
}

/** Уведомить подписчиков о новом товаре на витрине */
export async function notifyShopNewProduct(product) {
    if (!product?.shopId || !isNewOnCatalog(product)) return;

    const shopId = Number(product.shopId);
    const shop =
        product.shop ||
        (await prisma.shop.findUnique({
            where: { id: shopId },
            select: { name: true }
        }));

    const subs = await prisma.shopSubscription.findMany({
        where: { shopId }
    });
    if (!subs.length) return;

    const io = getIo();
    const link = `/product/${product.id}`;
    const shopName = shop?.name || 'Магазин';

    for (const sub of subs) {
        await pushNotification({
            type: 'SHOP',
            title: 'Новинка в магазине',
            message: `${shopName}: «${product.name}»`,
            link,
            groupKey: `shop-new-${shopId}-${product.id}`,
            userId: sub.userId
        });

        io.to(`customer_${sub.userId}`).emit('shop_new_product', {
            shopId,
            shopName,
            productId: product.id,
            productName: product.name,
            link
        });
    }
}

export async function notifyIfPublished(product, previous) {
    const wasVisible = isNewOnCatalog(previous);
    const isVisible = isNewOnCatalog(product);
    if (!wasVisible && isVisible) {
        await notifyShopNewProduct(product);
    }
}

function formatPromoDiscount(promo) {
    if (promo.discountType === 'PERCENT') return `−${promo.discountValue}%`;
    return `−${promo.discountValue} ₽`;
}

/** Рассылка подписчикам об акции / промокоде */
export async function notifyShopPromo(promo, shop) {
    if (!promo?.isActive || !promo?.shopId) return;

    const shopId = Number(promo.shopId);
    const shopName =
        shop?.name ||
        (await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } }))?.name ||
        'Магазин';

    const subs = await prisma.shopSubscription.findMany({ where: { shopId } });
    if (!subs.length) return;

    const io = getIo();
    const link = `/catalog/${shopId}`;
    const code = promo.code;
    const discount = formatPromoDiscount(promo);
    const message = promo.description
        ? `${shopName}: ${promo.description} (${code}, ${discount})`
        : `${shopName}: промокод ${code} (${discount})`;

    for (const sub of subs) {
        await pushNotification({
            type: 'SHOP',
            title: 'Акция в магазине',
            message,
            link,
            groupKey: `shop-promo-${shopId}-${promo.id}`,
            userId: sub.userId
        });

        io.to(`customer_${sub.userId}`).emit('shop_promo', {
            shopId,
            shopName,
            promoId: promo.id,
            code,
            link
        });
    }
}
