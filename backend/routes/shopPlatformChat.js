import { Router } from 'express';
import { authenticateToken, resolveShopAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { saveBase64Image } from '../utils/saveImage.js';
import {
    listPlatformMessages,
    markPlatformMessagesRead,
    sendPlatformMessage
} from '../services/platformChatService.js';

const router = Router();

router.get(
    '/',
    authenticateToken,
    resolveShopAdmin,
    asyncHandler(async (req, res) => {
        const shopId = Number(req.shopId);
        const messages = await listPlatformMessages(shopId);
        await markPlatformMessagesRead(shopId, false);
        res.json({ shopId, messages });
    })
);

router.post(
    '/',
    authenticateToken,
    resolveShopAdmin,
    asyncHandler(async (req, res) => {
        const shopId = Number(req.shopId);
        const { text, imageBase64 } = req.body;
        let imageUrl = null;
        if (imageBase64) {
            imageUrl = await saveBase64Image(imageBase64, 'platform-chat');
        }

        const message = await sendPlatformMessage({
            shopId,
            senderUserId: Number(req.user.userId),
            isFromPlatform: false,
            text,
            imageUrl
        });

        res.status(201).json(message);
    })
);

export default router;
