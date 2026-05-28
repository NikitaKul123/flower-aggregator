import { Router } from 'express';

import { PrismaClient } from '@prisma/client';

import { authenticateToken, resolveActor } from '../middleware/auth.js';

import { asyncHandler } from '../middleware/asyncHandler.js';

import {
    listNotifications,
    getUnreadCounts,
    markRead,
    markAllRead,
    getSettings
} from '../services/notificationService.js';

import { NotFoundError } from '../utils/errors.js';



const router = Router();

const prisma = new PrismaClient();



router.use(authenticateToken, resolveActor);



function recipient(req) {
    if (req.user.role === 'SHOP_ADMIN') {
        return { shopId: Number(req.shopId) };
    }
    return { userId: Number(req.user.userId) };
}



router.get('/', asyncHandler(async (req, res) => {

    const list = await listNotifications(recipient(req));

    res.json(list);

}));



router.get('/count', asyncHandler(async (req, res) => {
    const counts = await getUnreadCounts(recipient(req));
    res.json(counts);
}));



router.put('/read-all', asyncHandler(async (req, res) => {

    await markAllRead(recipient(req));

    res.json({ success: true });

}));



router.get('/settings', asyncHandler(async (req, res) => {

    const settings = await getSettings(recipient(req));

    res.json(settings);

}));



router.put('/settings', asyncHandler(async (req, res) => {

    const rec = recipient(req);

    const {

        enableOrder,

        enableChat,

        enableStatus,

        enableStock,

        enableShop,

        enableEmail,

        enableBrowserPush,

        soundEnabled,

        doNotDisturb,

        dndFrom,

        dndTo

    } = req.body;



    const data = {};

    if (enableOrder !== undefined) data.enableOrder = !!enableOrder;

    if (enableChat !== undefined) data.enableChat = !!enableChat;

    if (enableStatus !== undefined) data.enableStatus = !!enableStatus;

    if (enableStock !== undefined) data.enableStock = !!enableStock;

    if (enableShop !== undefined) data.enableShop = !!enableShop;

    if (enableEmail !== undefined) data.enableEmail = !!enableEmail;

    if (enableBrowserPush !== undefined) data.enableBrowserPush = !!enableBrowserPush;

    if (soundEnabled !== undefined) data.soundEnabled = !!soundEnabled;

    if (doNotDisturb !== undefined) data.doNotDisturb = !!doNotDisturb;

    if (dndFrom !== undefined) data.dndFrom = dndFrom;

    if (dndTo !== undefined) data.dndTo = dndTo;



    let settings;

    if (rec.shopId) {

        settings = await prisma.notificationSettings.upsert({

            where: { shopId: rec.shopId },

            create: { shopId: rec.shopId, ...data },

            update: data

        });

    } else {

        settings = await prisma.notificationSettings.upsert({

            where: { userId: rec.userId },

            create: { userId: rec.userId, ...data },

            update: data

        });

    }



    res.json(settings);

}));



router.put('/:id/read', asyncHandler(async (req, res) => {

    const n = await markRead(req.params.id, recipient(req));

    if (!n) throw new NotFoundError('Уведомление не найдено');

    res.json(n);

}));



export default router;


