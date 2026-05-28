import { PrismaClient } from '@prisma/client';
import { syncProductFlags } from './productVisibility.js';
import { pushNotification } from '../services/notificationService.js';
import { getIo } from '../socket/io.js';

const prisma = new PrismaClient();

function isAtZero(product) {
    if (product.stock != null) return product.stock <= 0;
    return !!product.isOutOfStock;
}

/**
 * Применить правила магазина: скрыть с витрины или «нет в наличии» + уведомление.
 */
export async function enforceZeroStockRules(productId, { notify = true, wasAtZero = false } = {}) {
    const product = await prisma.product.findUnique({
        where: { id: Number(productId) },
        include: { shop: { select: { id: true, name: true, autoHideZeroStock: true } } }
    });
    if (!product) return null;

    const atZero = isAtZero(product);
    if (!atZero) return product;

    const shop = product.shop;

    let data = { isOutOfStock: true };
    if (product.stock != null) data.stock = product.stock;
    data = syncProductFlags({ ...data, status: 'ACTIVE', isOutOfStock: true });

    const updated = await prisma.product.update({
        where: { id: product.id },
        data
    });

    if (notify && shop?.autoHideZeroStock && !wasAtZero) {
        await notifyShopRestock(shop, updated);
        const io = getIo();
        io?.to(`shop_${shop.id}`).emit('stock_alert', {
            productId: updated.id,
            productName: updated.name,
            disabled: true
        });
    }

    return updated;
}

/** Списание остатка после заказа */
export async function applyStockAfterSale(productId, qtySold = 1) {
    const product = await prisma.product.findUnique({
        where: { id: Number(productId) },
        select: { id: true, stock: true, isOutOfStock: true }
    });
    if (!product) return null;

    if (product.stock == null) {
        return product;
    }

    const wasAtZero = product.stock <= 0;
    const qty = Math.max(1, Number(qtySold) || 1);
    const newStock = Math.max(0, product.stock - qty);

    await prisma.product.update({
        where: { id: product.id },
        data: { stock: newStock }
    });

    if (newStock <= 0) {
        return enforceZeroStockRules(productId, { wasAtZero });
    }

    if (newStock > 0 && product.isOutOfStock) {
        return prisma.product.update({
            where: { id: product.id },
            data: syncProductFlags({ isOutOfStock: false, status: 'ACTIVE' })
        });
    }

    return product;
}

async function notifyShopRestock(shop, product) {
    await pushNotification({
        type: 'STOCK',
        title: 'Пополните склад',
        message: `«${product.name}» — остаток 0. Товар отключён на витрине (нет в наличии).`,
        link: '/shop/products',
        shopId: shop.id,
        groupKey: `shop-low-stock-${product.id}`
    });
}
