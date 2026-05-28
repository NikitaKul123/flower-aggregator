import { PrismaClient } from '@prisma/client';
import { ForbiddenError } from './errors.js';

const prisma = new PrismaClient();

export const BLOCKED_LOGIN_MESSAGE =
    'Аккаунт заблокирован. Обратитесь в поддержку платформы.';

export async function isUserBlocked(userId) {
    const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { isBlocked: true }
    });
    return Boolean(user?.isBlocked);
}

export async function assertUserNotBlocked(userId) {
    if (await isUserBlocked(userId)) {
        throw new ForbiddenError(BLOCKED_LOGIN_MESSAGE);
    }
}

export function generateTempPassword(length = 12) {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < length; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}
