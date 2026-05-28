import { PrismaClient } from '@prisma/client';
import { catalogWhere } from '../utils/productVisibility.js';

const prisma = new PrismaClient();
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
                    address: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    console.log('ok', products.length);
} catch (e) {
    console.error('ERR', e);
} finally {
    await prisma.$disconnect();
}
