import { PrismaClient } from '@prisma/client';
import { applyStockAfterSale } from '../utils/productStockRules.js';

const prisma = new PrismaClient();
const id = 17;

await prisma.shop.update({ where: { id: 9 }, data: { autoHideZeroStock: true } });
await prisma.product.update({
    where: { id },
    data: { stock: 2, status: 'ACTIVE', isOutOfStock: false, isActive: true }
});

const before = await prisma.product.findUnique({ where: { id }, select: { stock: true, status: true } });
console.log('start', before, 'type', typeof before.stock);
const r = await applyStockAfterSale(id, 2);
console.log('calc', before.stock - 2, 'newStock would be', Math.max(0, before.stock - 2));
console.log('returned', { stock: r?.stock, status: r?.status, isOutOfStock: r?.isOutOfStock });
console.log('db', await prisma.product.findUnique({
    where: { id },
    select: { stock: true, status: true, isOutOfStock: true }
}));

await prisma.$disconnect();
