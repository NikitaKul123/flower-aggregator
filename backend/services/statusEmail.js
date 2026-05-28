import { PrismaClient } from '@prisma/client';
import { getSettings, isInDndWindow } from './notificationService.js';
import { sendOrderStatusEmail } from './emailService.js';

const prisma = new PrismaClient();

export async function notifyCustomerStatusByEmail({ userId, orderId, statusLabel, shopName }) {
    try {
        const settings = await getSettings({ userId: Number(userId) });
        if (!settings?.enableStatus || !settings?.enableEmail) return;
        if (isInDndWindow(settings)) return;

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: { email: true, name: true }
        });
        if (!user?.email) return;

        await sendOrderStatusEmail({
            to: user.email,
            userName: user.name,
            orderId: Number(orderId),
            statusLabel,
            shopName
        });
    } catch (e) {
        console.error('[statusEmail]', e.message);
    }
}
