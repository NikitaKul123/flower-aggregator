import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BLOCKED_LOGIN_MESSAGE } from '../utils/userBlock.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_change_this_in_production';

// ================= REGISTER (USER ONLY) =================
export const register = async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;

        const emailClean = email?.trim()?.toLowerCase();
        const nameClean = name?.trim();

        if (!emailClean || !password || !nameClean) {
            return res.status(400).json({
                error: 'Поля email, password и name обязательны'
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: emailClean }
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'Пользователь уже существует'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: emailClean,
                password: hashedPassword,
                name: nameClean,
                phone: phone || null,
                role: Role.CUSTOMER
            }
        });

        return res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role
            }
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        return res.status(500).json({
            error: 'Ошибка сервера при регистрации'
        });
    }
};

// ================= LOGIN (USER ONLY) =================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email и пароль обязательны'
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() }
        });

        if (!user) {
            return res.status(401).json({
                error: 'Неверный email или пароль'
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({ error: BLOCKED_LOGIN_MESSAGE });
        }

        // ❗ блокируем SHOP_ADMIN здесь
        if (user.role !== Role.CUSTOMER) {
            return res.status(403).json({
                error: 'Используйте вход для магазина'
            });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({
                error: 'Неверный email или пароль'
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            error: 'Ошибка сервера при входе'
        });
    }
};