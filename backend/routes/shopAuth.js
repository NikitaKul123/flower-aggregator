import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { BLOCKED_LOGIN_MESSAGE } from '../utils/userBlock.js';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;


// ================= РЕГИСТРАЦИЯ =================

router.post('/register', async (req, res) => {
    try {
        const {
            email,
            password,
            name,
            phone,
            shopName,
            address,
            deliveryTime
        } = req.body;

        const existing = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase()
            }
        });

        if (existing) {
            return res.status(400).json({
                error: 'Email уже используется'
            });
        }

        const hashed = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashed,
                name,
                phone,
                role: 'SHOP_ADMIN'
            }
        });

        const shop = await prisma.shop.create({
            data: {
                name: shopName,
                address,
                phone,
                deliveryTime: deliveryTime || '60-90 мин',
                ownerId: user.id
            }
        });

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                email: user.email,
                name: user.name,
                shopId: shop.id
            },
            JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                shopId: shop.id,
                shopName: shop.name,
                shopAvatar: shop.avatar
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Ошибка регистрации'
        });
    }
});


// ================= ВХОД =================

router.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase()
            }
        });

        if (!user) {
            return res.status(401).json({
                error: 'Пользователь не найден'
            });
        }

        if (user.role !== 'SHOP_ADMIN') {
            return res.status(403).json({
                error: 'Используйте вход для магазина'
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({ error: BLOCKED_LOGIN_MESSAGE });
        }

        const valid = await bcrypt.compare(
            password,
            user.password
        );

        if (!valid) {
            return res.status(401).json({
                error: 'Неверный пароль'
            });
        }

        const shop = await prisma.shop.findFirst({
            where: {
                ownerId: user.id
            }
        });

        if (!shop) {
            return res.status(404).json({
                error: 'Магазин не найден'
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                email: user.email,
                name: user.name,
                shopId: shop.id
            },
            JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                shopId: shop.id,
                shopName: shop.name,
                shopAvatar: shop.avatar
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Ошибка входа'
        });
    }
});

export default router;