import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const vapidPublic = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@flower-aggregator.local';

if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

export function isWebPushConfigured() {
    return Boolean(vapidPublic && vapidPrivate);
}

export function getVapidPublicKey() {
    return vapidPublic || null;
}

function subscriptionPayload(row) {
    return {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth }
    };
}

function absoluteUrl(link) {
    const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    if (!link) return base;
    return link.startsWith('http') ? link : `${base}${link.startsWith('/') ? link : `/${link}`}`;
}

export async function savePushSubscription({ userId, shopId, subscription, userAgent }) {
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
        throw new Error('Invalid push subscription');
    }

    const uid = userId != null ? Number(userId) : null;
    const sid = shopId != null ? Number(shopId) : null;

    return prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
            endpoint,
            p256dh,
            auth,
            userId: uid,
            shopId: sid,
            userAgent: userAgent || null
        },
        update: {
            p256dh,
            auth,
            userId: uid,
            shopId: sid,
            userAgent: userAgent || null,
            updatedAt: new Date()
        }
    });
}

export async function deletePushSubscription(endpoint) {
    if (!endpoint) return;
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function deleteAllPushSubscriptionsForRecipient({ userId, shopId }) {
    if (userId != null) {
        await prisma.pushSubscription.deleteMany({ where: { userId: Number(userId) } });
    }
    if (shopId != null) {
        await prisma.pushSubscription.deleteMany({ where: { shopId: Number(shopId) } });
    }
}

async function findSubscriptions({ userId, shopId }) {
    const or = [];
    if (userId != null) or.push({ userId: Number(userId) });
    if (shopId != null) or.push({ shopId: Number(shopId) });
    if (!or.length) return [];
    return prisma.pushSubscription.findMany({
        where: or.length === 1 ? or[0] : { OR: or }
    });
}

export async function sendWebPushToRecipient({ userId, shopId, title, body, link, tag }) {
    if (!isWebPushConfigured()) return { sent: 0, skipped: true };

    const subs = await findSubscriptions({ userId, shopId });
    if (!subs.length) return { sent: 0 };

    const payload = JSON.stringify({
        title: title || 'FlowerShop',
        body: body || '',
        url: absoluteUrl(link),
        tag: tag || `push-${Date.now()}`
    });

    let sent = 0;
    for (const sub of subs) {
        try {
            await webpush.sendNotification(subscriptionPayload(sub), payload);
            sent += 1;
        } catch (err) {
            const code = err?.statusCode;
            if (code === 404 || code === 410) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            } else {
                console.error('Web push failed:', code, err?.body || err?.message);
            }
        }
    }
    return { sent };
}
