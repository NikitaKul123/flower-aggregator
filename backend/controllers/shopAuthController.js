import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_change_this_in_production';

// ================= SHOP LOGIN =================
export const shopLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            include: { shop: true }
        });

        if (!user) {
            return res.status(401).json({
                error: 'Неверный email или пароль'
            });
        }

        // ❗ только SHOP_ADMIN
        if (user.role !== Role.SHOP_ADMIN) {
            return res.status(403).json({
                error: 'Используйте вход для обычного пользователя'
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
                role: user.role,
                shopId: user.shop?.id
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
                role: user.role,
                shopId: user.shop?.id
            }
        });

    } catch (error) {
        console.error("SHOP LOGIN ERROR:", error);

        return res.status(500).json({
            error: 'Ошибка входа магазина'
        });
    }
};