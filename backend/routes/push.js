import { Router } from 'express';
import { authenticateToken, resolveActor } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
    savePushSubscription,
    deletePushSubscription,
    deleteAllPushSubscriptionsForRecipient,
    getVapidPublicKey,
    isWebPushConfigured
} from '../services/webPushService.js';

const router = Router();

router.get('/vapid-public-key', (_req, res) => {
    const key = getVapidPublicKey();
    if (!key) {
        return res.status(503).json({ error: 'Web Push не настроен на сервере' });
    }
    res.json({ publicKey: key, configured: isWebPushConfigured() });
});

router.use(authenticateToken, resolveActor);

function recipient(req) {
    if (req.user.role === 'SHOP_ADMIN' && req.shopId) {
        return { userId: Number(req.user.userId), shopId: Number(req.shopId) };
    }
    return { userId: Number(req.user.userId), shopId: null };
}

router.post('/subscribe', asyncHandler(async (req, res) => {
    const { subscription } = req.body;
    const rec = recipient(req);
    const row = await savePushSubscription({
        ...rec,
        subscription,
        userAgent: req.headers['user-agent']
    });
    res.status(201).json({ success: true, id: row.id });
}));

router.delete('/subscribe', asyncHandler(async (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) {
        await deletePushSubscription(endpoint);
    }
    res.json({ success: true });
}));

router.delete('/subscribe-all', asyncHandler(async (req, res) => {
    await deleteAllPushSubscriptionsForRecipient(recipient(req));
    res.json({ success: true });
}));

export default router;
