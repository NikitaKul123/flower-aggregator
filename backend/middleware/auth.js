import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { BLOCKED_LOGIN_MESSAGE } from '../utils/userBlock.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(new UnauthorizedError('Токен не предоставлен'));
    }

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) return next(new ForbiddenError('Недействительный токен'));
        try {
            const row = await prisma.user.findUnique({
                where: { id: Number(user.userId) },
                select: { isBlocked: true }
            });
            if (row?.isBlocked) {
                return next(new ForbiddenError(BLOCKED_LOGIN_MESSAGE));
            }
            req.user = user;
            next();
        } catch (e) {
            next(e);
        }
    });
};

export const isShopAdmin = (req, res, next) => {
    if (req.user?.role !== 'SHOP_ADMIN') {
        return next(new ForbiddenError('Доступ разрешён только магазинам'));
    }
    next();
};

export function isSuperAdminRole(role) {
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export const requireSuperAdmin = (req, res, next) => {
    if (!isSuperAdminRole(req.user?.role)) {
        return next(new ForbiddenError('Доступ только для супер-админа'));
    }
    next();
};

export const requireCustomer = (req, res, next) => {
    if (req.user?.role === 'SHOP_ADMIN' || req.user?.role === 'COURIER' || isSuperAdminRole(req.user?.role)) {
        return next(new ForbiddenError('Доступ только для клиентов'));
    }
    if (!req.user?.userId) {
        return next(new UnauthorizedError());
    }
    next();
};

export const requireCourier = (req, res, next) => {
    if (req.user?.role !== 'COURIER') {
        return next(new ForbiddenError('Доступ только для курьеров'));
    }
    next();
};

export const resolveCourier = async (req, res, next) => {
    if (req.user?.role !== 'COURIER') {
        return next(new ForbiddenError('Доступ только для курьеров'));
    }
    try {
        const link = await prisma.shopCourier.findUnique({
            where: { userId: Number(req.user.userId) },
            select: { shopId: true, isActive: true }
        });
        if (!link?.isActive) {
            return next(new ForbiddenError('Аккаунт курьера отключён'));
        }
        req.shopId = link.shopId;
        req.user.shopId = link.shopId;
        next();
    } catch (e) {
        next(e);
    }
};

/** shopId из БД по владельцу — не доверяем только JWT */
export const resolveShopAdmin = async (req, res, next) => {
    if (req.user?.role !== 'SHOP_ADMIN') {
        return next(new ForbiddenError('Доступ разрешён только магазинам'));
    }

    try {
        const shop = await prisma.shop.findFirst({
            where: { ownerId: Number(req.user.userId) },
            select: { id: true }
        });

        if (!shop) {
            return next(new ForbiddenError('Магазин не найден'));
        }

        req.shopId = shop.id;
        req.user.shopId = shop.id;
        next();
    } catch (e) {
        next(e);
    }
};

/** Для маршрутов, доступных и клиенту, и магазину */
export const resolveActor = async (req, res, next) => {
    if (req.user?.role === 'SHOP_ADMIN') {
        return resolveShopAdmin(req, res, next);
    }
    if (req.user?.role === 'COURIER') {
        return resolveCourier(req, res, next);
    }
    if (!req.user?.userId) {
        return next(new UnauthorizedError());
    }
    next();
};

export function verifySocketToken(token) {
    return new Promise((resolve, reject) => {
        if (!token) return reject(new UnauthorizedError('Токен не предоставлен'));
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return reject(new ForbiddenError('Недействительный токен'));
            resolve(user);
        });
    });
}

export async function resolveSocketShopId(user) {
    if (user.role === 'SHOP_ADMIN') {
        const shop = await prisma.shop.findFirst({
            where: { ownerId: Number(user.userId) },
            select: { id: true }
        });
        return shop?.id ?? null;
    }
    if (user.role === 'COURIER') {
        const link = await prisma.shopCourier.findUnique({
            where: { userId: Number(user.userId) },
            select: { shopId: true, isActive: true }
        });
        return link?.isActive ? link.shopId : null;
    }
    return null;
}
