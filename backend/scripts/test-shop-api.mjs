import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../app.js';

dotenv.config();

const prisma = new PrismaClient();
const app = createApp();

const shop = await prisma.shop.findFirst({
    where: { ownerId: { not: null } },
    include: { owner: true }
});

const user = shop?.owner || (await prisma.user.findFirst({ where: { role: 'SHOP_ADMIN' } }));
if (!user) {
    console.error('No SHOP_ADMIN user');
    process.exit(1);
}

const token = jwt.sign({ userId: user.id, role: 'SHOP_ADMIN' }, process.env.JWT_SECRET);

const ordersRes = await request(app)
    .get('/api/shop/orders')
    .set('Authorization', `Bearer ${token}`);

console.log('GET /api/shop/orders', ordersRes.status);
if (ordersRes.status !== 200) console.log(ordersRes.body);

const review = await prisma.orderReview.findFirst();
if (review) {
    const replyRes = await request(app)
        .put(`/api/shop/reviews/${review.id}/reply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Спасибо за отзыв!' });
    console.log('PUT reply', replyRes.status);
    if (replyRes.status !== 200) console.log(replyRes.body);
} else {
    console.log('No reviews in DB');
}

await prisma.$disconnect();
