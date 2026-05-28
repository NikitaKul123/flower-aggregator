import { PrismaClient } from '@prisma/client';
import { pushNotification, getUnreadCounts, getInboxUnreadCount } from '../services/notificationService.js';

const prisma = new PrismaClient();

async function main() {
    const order = await prisma.order.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true, userId: true, status: true }
    });
    if (!order) {
        console.log('NO_ORDER');
        return;
    }

    const userId = order.userId;
    const before = await getUnreadCounts({ userId });
    console.log('BEFORE', before);

    const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
    console.log('SETTINGS', settings);

    const notif = await pushNotification({
        type: 'STATUS',
        title: `Заказ №${order.id}`,
        message: 'Тест статуса',
        link: '/orders',
        orderId: order.id,
        groupKey: `status-${order.id}`,
        userId
    });
    console.log('PUSH_RESULT', notif ? { id: notif.id, readAt: notif.readAt, groupKey: notif.groupKey } : null);

    const after = await getUnreadCounts({ userId });
    const inbox = await getInboxUnreadCount({ userId });
    console.log('AFTER', after, 'INBOX', inbox);

    const unread = await prisma.notification.findMany({
        where: { userId, readAt: null },
        select: { id: true, type: true, groupKey: true, orderId: true }
    });
    console.log('UNREAD_ROWS', unread);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
