import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Средний рейтинг магазина по отзывам на доставленные заказы */
export async function getShopRatingsMap(shopIds) {
    const ids = [...new Set(shopIds.map(Number).filter(Boolean))];
    const result = new Map();
    if (!ids.length) return result;

    const reviews = await prisma.orderReview.findMany({
        where: {
            order: { shopId: { in: ids }, status: 'DELIVERED' }
        },
        select: {
            rating: true,
            order: { select: { shopId: true } }
        }
    });

    const acc = new Map();
    for (const r of reviews) {
        const sid = r.order.shopId;
        if (!acc.has(sid)) acc.set(sid, { sum: 0, count: 0 });
        const e = acc.get(sid);
        e.sum += r.rating;
        e.count += 1;
    }

    for (const [sid, { sum, count }] of acc) {
        result.set(sid, {
            rating: Math.round((sum / count) * 10) / 10,
            reviewCount: count
        });
    }
    return result;
}

export async function refreshShopRating(shopId) {
    const map = await getShopRatingsMap([shopId]);
    const data = map.get(Number(shopId));
    if (data) {
        await prisma.shop.update({
            where: { id: Number(shopId) },
            data: { rating: data.rating }
        });
        return data;
    }
    return { rating: null, reviewCount: 0 };
}

export function attachRatingsToShops(shops, ratingsMap) {
    return shops.map(shop => {
        const stats = ratingsMap.get(shop.id);
        return {
            ...shop,
            rating: stats?.rating ?? null,
            reviewCount: stats?.reviewCount ?? 0
        };
    });
}
