import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { saveBase64Image } from '../utils/saveImage.js';
import {
    listPlatformConversations,
    listPlatformMessages,
    markPlatformMessagesRead,
    sendPlatformMessage
} from '../services/platformChatService.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, requireSuperAdmin);

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const data = await listPlatformConversations(req.query.search);
        res.json(data);
    })
);

router.get(
    '/:shopId',
    asyncHandler(async (req, res) => {
        const shopId = Number(req.params.shopId);
        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            select: {
                id: true,
                name: true,
                isVerified: true,
                isSuspended: true,
                owner: { select: { id: true, name: true, email: true } }
            }
        });
        if (!shop) return res.status(404).json({ error: 'Магазин не найден' });

        const messages = await listPlatformMessages(shopId);
        await markPlatformMessagesRead(shopId, true);
        res.json({ shop, messages });
    })
);

router.post(
    '/:shopId',
    asyncHandler(async (req, res) => {
        const shopId = Number(req.params.shopId);
        const { text, imageBase64 } = req.body;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ error: 'Магазин не найден' });

        let imageUrl = null;
        if (imageBase64) {
            imageUrl = await saveBase64Image(imageBase64, 'platform-chat');
        }

        const message = await sendPlatformMessage({
            shopId,
            senderUserId: Number(req.user.userId),
            isFromPlatform: true,
            text,
            imageUrl
        });

        res.status(201).json(message);
    })
);

export default router;
