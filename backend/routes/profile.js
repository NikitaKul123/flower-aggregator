import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { saveBase64Image } from '../utils/saveImage.js';

const router = Router();
const prisma = new PrismaClient();

function requireCustomer(req, res, next) {
    if (req.user.role === 'SHOP_ADMIN') {
        return res.status(403).json({ error: 'Доступ только для клиентов' });
    }
    next();
}

router.get('/', authenticateToken, requireCustomer, async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                avatar: true,
                addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
                preferences: true
            }
        });
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка загрузки профиля' });
    }
});

router.put('/', authenticateToken, requireCustomer, async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const { name, phone, preferences } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name != null && { name: String(name).trim() }),
                ...(phone != null && { phone: String(phone).trim() || null })
            },
            select: { id: true, email: true, name: true, phone: true }
        });

        if (preferences) {
            await prisma.userPreferences.upsert({
                where: { userId },
                create: {
                    userId,
                    deliveryNotes: preferences.deliveryNotes ?? null,
                    contactMethod: preferences.contactMethod ?? 'phone',
                    newsletter: !!preferences.newsletter
                },
                update: {
                    deliveryNotes: preferences.deliveryNotes ?? null,
                    contactMethod: preferences.contactMethod ?? 'phone',
                    newsletter: preferences.newsletter != null ? !!preferences.newsletter : undefined
                }
            });
        }

        const full = await prisma.user.findUnique({
            where: { id: userId },
            include: { preferences: true, addresses: true }
        });
        res.json(full);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

router.post('/addresses', authenticateToken, requireCustomer, async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const { label, title, address, isDefault } = req.body;
        if (!address?.trim()) {
            return res.status(400).json({ error: 'Укажите адрес' });
        }
        const validLabels = ['HOME', 'WORK', 'OTHER'];
        const addrLabel = validLabels.includes(label) ? label : 'OTHER';

        if (isDefault) {
            await prisma.deliveryAddress.updateMany({
                where: { userId },
                data: { isDefault: false }
            });
        }

        const created = await prisma.deliveryAddress.create({
            data: {
                userId,
                label: addrLabel,
                title: title?.trim() || null,
                address: address.trim(),
                isDefault: !!isDefault
            }
        });
        res.status(201).json(created);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка добавления адреса' });
    }
});

router.put('/addresses/:id', authenticateToken, requireCustomer, async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const id = Number(req.params.id);
        const existing = await prisma.deliveryAddress.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Адрес не найден' });

        const { label, title, address, isDefault } = req.body;
        if (isDefault) {
            await prisma.deliveryAddress.updateMany({
                where: { userId },
                data: { isDefault: false }
            });
        }

        const updated = await prisma.deliveryAddress.update({
            where: { id },
            data: {
                ...(label && { label }),
                ...(title !== undefined && { title: title?.trim() || null }),
                ...(address && { address: address.trim() }),
                ...(isDefault !== undefined && { isDefault: !!isDefault })
            }
        });
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

router.delete('/addresses/:id', authenticateToken, requireCustomer, async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const id = Number(req.params.id);
        const existing = await prisma.deliveryAddress.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Адрес не найден' });
        await prisma.deliveryAddress.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

router.put('/avatar', authenticateToken, requireCustomer, async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'Нет изображения' });
        const avatar = saveBase64Image(imageBase64, 'avatar-user');
        if (!avatar) return res.status(400).json({ error: 'Неверный формат' });

        const user = await prisma.user.update({
            where: { id: Number(req.user.userId) },
            data: { avatar },
            select: { id: true, email: true, name: true, phone: true, avatar: true }
        });
        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Ошибка загрузки' });
    }
});

export default router;
