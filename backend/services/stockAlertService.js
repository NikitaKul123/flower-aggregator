import { PrismaClient } from '@prisma/client';
import { getIo } from '../socket/io.js';
import { pushNotification } from './notificationService.js';
import { isPurchasable } from '../utils/productVisibility.js';

const prisma = new PrismaClient();

/** Уведомить подписчиков, когда товар снова в наличии */
export async function notifyStockAlerts(productId) {
    const product = await prisma.product.findUnique({
        where: { id: Number(productId) },
        include: { shop: { select: { name: true } } }
    });
    if (!product || !isPurchasable(product)) return;

    const alerts = await prisma.stockAlert.findMany({
        where: { productId: product.id, notifiedAt: null }
    });
    if (!alerts.length) return;

    const io = getIo();
    const link = `/product/${product.id}`;

    for (const alert of alerts) {
        await pushNotification({
            type: 'STOCK',
            title: 'Товар снова в наличии',
            message: `«${product.name}» снова доступен${product.shop?.name ? ` · ${product.shop.name}` : ''}`,
            link,
            groupKey: `stock-${product.id}`,
            userId: alert.userId
        });

        io.to(`customer_${alert.userId}`).emit('stock_available', {
            productId: product.id,
            productName: product.name,
            link
        });

        await prisma.stockAlert.update({
            where: { id: alert.id },
            data: { notifiedAt: new Date() }
        });
    }
}

export async function wasOutOfStock(product) {
    if (!product) return false;
    return product.isOutOfStock
        || product.status === 'HIDDEN'
        || (product.stock != null && product.stock <= 0);
}
