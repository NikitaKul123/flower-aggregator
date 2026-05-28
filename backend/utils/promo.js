import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Проверка срока: validTo действует до конца указанного дня */
export function isPromoActive(promo, now = new Date()) {
    if (promo?.isActive === false) return false;
    if (promo.validFrom) {
        const from = new Date(promo.validFrom);
        if (now < from) return false;
    }
    if (promo.validTo) {
        const to = new Date(promo.validTo);
        to.setHours(23, 59, 59, 999);
        if (now > to) return false;
    }
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
    return true;
}

const publicPromoSelect = {
    code: true,
    description: true,
    discountType: true,
    discountValue: true,
    minOrder: true,
    validFrom: true,
    validTo: true,
    maxUses: true,
    usedCount: true,
    isActive: true
};

export async function fetchPublicPromosForShop(shopId) {
    const sid = Number(shopId);
    if (!sid) return [];
    const now = new Date();
    const list = await prisma.promoCode.findMany({
        where: { shopId: sid, isActive: true },
        select: publicPromoSelect,
        orderBy: { createdAt: 'desc' }
    });
    return list.filter(p => isPromoActive(p, now));
}

export async function validatePromo(code, shopId, subtotal) {
    if (!code?.trim()) return { error: 'Введите промокод' };
    const sid = Number(shopId);
    if (!sid) return { error: 'Не указан магазин' };
    const promo = await prisma.promoCode.findFirst({
        where: { shopId: sid, code: code.trim().toUpperCase(), isActive: true }
    });
    if (!promo) return { error: 'Промокод не найден' };
    if (!isPromoActive(promo)) {
        const now = new Date();
        if (promo.validFrom && now < new Date(promo.validFrom)) {
            return { error: 'Промокод ещё не действует' };
        }
        if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
            return { error: 'Лимит использований исчерпан' };
        }
        return { error: 'Срок промокода истёк' };
    }
    if (subtotal < promo.minOrder) {
        return { error: `Минимальная сумма заказа ${promo.minOrder} ₽` };
    }

    let discount = 0;
    if (promo.discountType === 'PERCENT') {
        discount = Math.round(subtotal * Math.min(promo.discountValue, 100) / 100);
    } else {
        discount = Math.min(promo.discountValue, subtotal);
    }

    return {
        promoId: promo.id,
        code: promo.code,
        discount,
        total: subtotal - discount
    };
}
