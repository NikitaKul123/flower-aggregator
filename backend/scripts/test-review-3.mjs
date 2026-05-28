import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../app.js';

dotenv.config();

const prisma = new PrismaClient();
const app = createApp();

const shop = await prisma.shop.findUnique({ where: { id: 9 }, include: { owner: true } });
console.log('shop 9 owner:', shop?.ownerId, shop?.owner?.email);

if (!shop?.ownerId) {
    console.error('no owner');
    process.exit(1);
}

const token = jwt.sign({ userId: shop.ownerId, role: 'SHOP_ADMIN' }, process.env.JWT_SECRET);

const ordersRes = await request(app).get('/api/shop/orders').set('Authorization', `Bearer ${token}`);
console.log('orders', ordersRes.status, ordersRes.body?.error);

const replyRes = await request(app)
    .put('/api/shop/reviews/3/reply')
    .set('Authorization', `Bearer ${token}`)
    .send({ text: 'Благодарим!' });
console.log('reply', replyRes.status, replyRes.body);

await prisma.$disconnect();
