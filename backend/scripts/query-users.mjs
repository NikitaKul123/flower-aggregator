import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const users = await p.user.findMany({ where: { role: 'CUSTOMER' }, take: 3, select: { id: true, email: true } });
const shop = await p.shop.findFirst({ include: { owner: { select: { email: true, id: true } } } });
const order = await p.order.findFirst({ orderBy: { id: 'desc' }, select: { id: true, userId: true, status: true, shopId: true } });
console.log(JSON.stringify({ users, shopOwner: shop?.owner, order }, null, 2));
await p.$disconnect();
