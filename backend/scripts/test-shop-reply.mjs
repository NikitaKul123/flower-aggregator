import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
    const review = await prisma.orderReview.findFirst({
        select: { id: true, shopReply: true, shopReplyAt: true }
    });
    console.log('findFirst:', review);

    const orders = await prisma.order.findMany({
        take: 1,
        include: {
            review: {
                select: {
                    id: true,
                    shopReply: true,
                    shopReplyAt: true
                }
            }
        }
    });
    console.log('order with review:', orders[0]?.review);

    if (review?.id) {
        const updated = await prisma.orderReview.update({
            where: { id: review.id },
            data: { shopReply: 'test reply', shopReplyAt: new Date() }
        });
        console.log('update ok:', updated.id, updated.shopReply);
    }
} catch (e) {
    console.error('FAILED:', e.message);
    if (e.meta) console.error(e.meta);
} finally {
    await prisma.$disconnect();
}
