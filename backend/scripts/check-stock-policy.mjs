import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const shops = await prisma.shop.findMany({ select: { id: true, name: true, autoHideZeroStock: true } });
const products = await prisma.product.findMany({
    take: 10,
    select: { id: true, name: true, stock: true, status: true, isOutOfStock: true, shopId: true }
});
console.log('shops:', shops);
console.log('products:', products);
await prisma.$disconnect();
