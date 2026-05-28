import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, isSuperAdminRole, requireSuperAdmin } from '../middleware/auth.js';
import { logAdminAudit } from '../utils/adminAudit.js';
import { generateTempPassword } from '../utils/userBlock.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, requireSuperAdmin);

const actorId = (req) => Number(req.user.userId);

router.get('/profile', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: actorId(req) },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true
            }
        });
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки профиля' });
    }
});

router.patch('/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || String(newPassword).length < 8) {
            return res.status(400).json({
                error: 'Укажите текущий пароль и новый (минимум 8 символов)'
            });
        }

        const user = await prisma.user.findUnique({ where: { id: actorId(req) } });
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return res.status(400).json({ error: 'Неверный текущий пароль' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { password: await bcrypt.hash(String(newPassword), 10) }
        });

        await logAdminAudit(prisma, {
            actorUserId: user.id,
            action: 'OWNER_PASSWORD_CHANGE',
            entityType: 'USER',
            entityId: user.id,
            message: 'Супер-админ сменил свой пароль'
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка смены пароля' });
    }
});

router.get('/team', async (req, res) => {
    try {
        const admins = await prisma.user.findMany({
            where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isBlocked: true,
                createdAt: true
            }
        });
        res.json(admins);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки команды' });
    }
});

router.post('/team', async (req, res) => {
    try {
        const email = String(req.body.email || '')
            .trim()
            .toLowerCase();
        const name = String(req.body.name || '').trim();
        const password = req.body.password
            ? String(req.body.password)
            : generateTempPassword(14);

        if (!email || !name) {
            return res.status(400).json({ error: 'Email и имя обязательны' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Пароль минимум 8 символов' });
        }

        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) {
            return res.status(400).json({ error: 'Пользователь с таким email уже есть' });
        }

        const created = await prisma.user.create({
            data: {
                email,
                name,
                password: await bcrypt.hash(password, 10),
                role: 'SUPER_ADMIN'
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        await logAdminAudit(prisma, {
            actorUserId: actorId(req),
            action: 'SUPER_ADMIN_CREATE',
            entityType: 'USER',
            entityId: created.id,
            message: `Создан супер-админ ${email}`,
            meta: { email }
        });

        res.status(201).json({
            user: created,
            temporaryPassword: req.body.password ? undefined : password
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка создания супер-админа' });
    }
});

export default router;
