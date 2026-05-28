import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BLOCKED_LOGIN_MESSAGE } from '../utils/userBlock.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            include: {
                shopCourier: {
                    include: {
                        shop: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                                phone: true,
                                avatar: true,
                                deliveryTime: true
                            }
                        }
                    }
                }
            }
        });

        if (!user || user.role !== 'COURIER') {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ error: BLOCKED_LOGIN_MESSAGE });
        }

        if (!user.shopCourier?.isActive) {
            return res.status(403).json({ error: 'Аккаунт курьера отключён' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const shopId = user.shopCourier.shopId;
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                email: user.email,
                name: user.name,
                shopId
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const shop = user.shopCourier.shop;

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                shopId,
                shopName: shop?.name,
                shop: shop ? {
                    id: shop.id,
                    name: shop.name,
                    address: shop.address,
                    phone: shop.phone,
                    avatar: shop.avatar,
                    deliveryTime: shop.deliveryTime
                } : null
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

export default router;
