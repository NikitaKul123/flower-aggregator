import { PrismaClient } from '@prisma/client';
import { pushNotification, getUnreadCounts } from '../services/notificationService.js';

const prisma = new PrismaClient();

async function main() {
    const order = await prisma.order.findFirst({ orderBy: { id: 'desc' }, select: { id: true, userId: true } });
    if (!order) return;

    await prisma.notificationSettings.upsert({
        where: { userId: order.userId },
        create: { userId: order.userId, enableStatus: false },
        update: { enableStatus: false }
    });

    const notif = await pushNotification({
        type: 'STATUS',
        title: `Заказ №${order.id}`,
        message: 'Тест при выключенном enableStatus',
        link: '/orders',
        orderId: order.id,
        groupKey: `status-${order.id}`,
        userId: order.userId
    });

    const counts = await getUnreadCounts({ userId: order.userId });
    console.log('enableStatus=false', { created: !!notif, count: counts.count });

    await prisma.notificationSettings.update({
        where: { userId: order.userId },
        data: { enableStatus: true }
    });
}

main().finally(() => prisma.$disconnect());
