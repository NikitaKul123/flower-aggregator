import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, resolveShopAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const ACTIVE_STATUSES = ['DELIVERED', 'CONFIRMED', 'READY', 'DELIVERING', 'ASSEMBLING'];
const STATUS_LABELS = {
    PENDING: 'Новые',
    CONFIRMED: 'Подтверждены',
    ASSEMBLING: 'Сборка',
    READY: 'Готовы',
    DELIVERING: 'Доставка',
    DELIVERED: 'Доставлены',
    NO_CONTACT: 'Не дозвонились',
    CANCELLED: 'Отменены'
};

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function startOfWeek(d) {
    const x = startOfDay(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
}

function dateKey(d) {
    return startOfDay(d).toISOString().slice(0, 10);
}

function buildChart(orders, period) {
    const count = period === 'week' ? 12 : 30;
    const today = startOfDay(new Date());
    const points = [];

    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(today);
        if (period === 'week') {
            d.setDate(d.getDate() - i * 7);
            const key = dateKey(startOfWeek(d));
            points.push({ date: key, orders: 0, revenue: 0 });
        } else {
            d.setDate(d.getDate() - i);
            const key = dateKey(d);
            points.push({ date: key, orders: 0, revenue: 0 });
        }
    }

    const byDate = new Map(points.map((p) => [p.date, p]));
    for (const o of orders) {
        const key =
            period === 'week'
                ? dateKey(startOfWeek(o.createdAt))
                : dateKey(o.createdAt);
        const bucket = byDate.get(key);
        if (!bucket) continue;
        bucket.orders += 1;
        if (o.status !== 'CANCELLED') bucket.revenue += o.total;
    }

    return points;
}

function aggregateTopProducts(orders) {
    const map = new Map();
    for (const o of orders) {
        if (o.status === 'CANCELLED') continue;
        const items = Array.isArray(o.items) ? o.items : [];
        for (const item of items) {
            const id = Number(item.id) || item.name;
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            if (!map.has(id)) {
                map.set(id, {
                    productId: Number(item.id) || null,
                    name: item.name || 'Товар',
                    quantity: 0,
                    revenue: 0
                });
            }
            const row = map.get(id);
            row.quantity += qty;
            row.revenue += price * qty;
        }
    }
    return Array.from(map.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);
}

function aggregateCategories(orders, productsById) {
    const map = new Map();
    for (const o of orders) {
        if (o.status === 'CANCELLED') continue;
        const items = Array.isArray(o.items) ? o.items : [];
        for (const item of items) {
            const product = productsById.get(Number(item.id));
            const cat = product?.category || item.category || 'Другое';
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || product?.price || 0;
            if (!map.has(cat)) map.set(cat, { category: cat, quantity: 0, revenue: 0 });
            const row = map.get(cat);
            row.quantity += qty;
            row.revenue += price * qty;
        }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

function buildHourlyDistribution(orders) {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
    for (const o of orders) {
        if (o.status === 'CANCELLED') continue;
        const h = new Date(o.createdAt).getHours();
        hours[h].orders += 1;
    }
    return hours;
}

function buildStatusBreakdown(orders) {
    const counts = {};
    for (const o of orders) {
        counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return Object.entries(counts)
        .map(([status, count]) => ({
            status,
            label: STATUS_LABELS[status] || status,
            count
        }))
        .sort((a, b) => b.count - a.count);
}

function customerStats(orders) {
    const active = orders.filter((o) => o.status !== 'CANCELLED');
    const byUser = new Map();
    for (const o of active) {
        byUser.set(o.userId, (byUser.get(o.userId) || 0) + 1);
    }
    const uniqueCustomers = byUser.size;
    const repeatCustomers = [...byUser.values()].filter((n) => n > 1).length;
    return {
        uniqueCustomers,
        repeatCustomers,
        repeatRate: uniqueCustomers
            ? Math.round((repeatCustomers / uniqueCustomers) * 100)
            : 0
    };
}

function periodDelta(current, previous) {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

function buildInsights({
    cancelRate,
    conversion,
    repeatRate,
    avgRating,
    reviewCount,
    topProducts,
    lowStock,
    stockAlertCount,
    promoUsageRate,
    peakHour,
    deliveredCount,
    totalOrders,
    uniqueCustomers
}) {
    const tips = [];

    if (totalOrders === 0) {
        tips.push({
            type: 'info',
            text: 'Пока нет заказов за выбранный период. Продвигайте витрину и проверьте, что товары в статусе «В продаже».'
        });
        return tips;
    }

    if (cancelRate >= 15) {
        tips.push({
            type: 'warning',
            text: `Отменено ${cancelRate}% заказов — проверьте сроки сборки и актуальность остатков, чтобы снизить отказы.`
        });
    }

    if (conversion < 50 && totalOrders >= 5) {
        tips.push({
            type: 'warning',
            text: 'Меньше половины заказов уходят в работу. Быстрее подтверждайте новые заказы — это влияет на конверсию.'
        });
    }

    if (repeatRate >= 30) {
        tips.push({
            type: 'success',
            text: `${repeatRate}% покупателей заказывают повторно — хороший знак лояльности.`
        });
    } else if (uniqueCustomers >= 3) {
        tips.push({
            type: 'info',
            text: 'Мало повторных покупок. Попробуйте промокод для постоянных клиентов или рассылку о новинках.'
        });
    }

    if (reviewCount > 0 && avgRating < 4) {
        tips.push({
            type: 'warning',
            text: `Средняя оценка ${avgRating} — просмотрите негативные отзывы и ответьте клиентам в чате.`
        });
    } else if (reviewCount === 0 && deliveredCount >= 3) {
        tips.push({
            type: 'info',
            text: 'После доставки клиенты могут оставить отзыв — это повышает доверие к магазину в каталоге.'
        });
    }

    if (topProducts.length >= 2) {
        const topShare = topProducts[0].revenue / topProducts.reduce((s, p) => s + p.revenue, 0);
        if (topShare >= 0.6) {
            tips.push({
                type: 'info',
                text: `«${topProducts[0].name}» даёт большую часть выручки — добавьте похожие позиции или комплекты.`
            });
        }
    }

    if (lowStock.length > 0) {
        tips.push({
            type: 'warning',
            text: `${lowStock.length} товар(ов) заканчиваются на складе — пополните, чтобы не терять заказы.`
        });
    }

    if (stockAlertCount > 0) {
        tips.push({
            type: 'info',
            text: `${stockAlertCount} клиент(ов) ждут уведомление о появлении товара — своевременно обновляйте остатки.`
        });
    }

    if (promoUsageRate >= 20) {
        tips.push({
            type: 'success',
            text: `Промокоды используются в ${promoUsageRate}% заказов — акции работают.`
        });
    }

    if (peakHour != null) {
        tips.push({
            type: 'info',
            text: `Пик заказов около ${peakHour}:00 — в это время держите менеджера на связи.`
        });
    }

    if (tips.length === 0) {
        tips.push({
            type: 'success',
            text: 'Показатели в норме. Следите за графиками и пополняйте хиты продаж.'
        });
    }

    return tips.slice(0, 6);
}

router.use(authenticateToken, resolveShopAdmin);

router.get('/', async (req, res) => {
    try {
        const shopId = Number(req.shopId);
        const period = req.query.period === 'week' ? 'week' : 'day';
        const windowDays = period === 'week' ? 84 : 30;
        const from = startOfDay(new Date(Date.now() - windowDays * 86400000));
        const prevFrom = startOfDay(new Date(Date.now() - windowDays * 2 * 86400000));

        const [orders, prevOrders, products, reviews, wishlistGrouped, stockAlertsGrouped] =
            await Promise.all([
                prisma.order.findMany({
                    where: { shopId, createdAt: { gte: from } },
                    select: {
                        id: true,
                        userId: true,
                        total: true,
                        discount: true,
                        status: true,
                        items: true,
                        isPickup: true,
                        promoCode: true,
                        createdAt: true
                    }
                }),
                prisma.order.findMany({
                    where: { shopId, createdAt: { gte: prevFrom, lt: from } },
                    select: { total: true, status: true }
                }),
                prisma.product.findMany({
                    where: { shopId },
                    select: { id: true, name: true, category: true, stock: true, isOutOfStock: true, status: true }
                }),
                prisma.orderReview.findMany({
                    where: { order: { shopId, createdAt: { gte: from } } },
                    select: { rating: true, text: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }),
                prisma.wishlistItem.groupBy({
                    by: ['productId'],
                    where: { product: { shopId } },
                    _count: { productId: true },
                    orderBy: { _count: { productId: 'desc' } },
                    take: 5
                }),
                prisma.stockAlert.groupBy({
                    by: ['productId'],
                    where: { product: { shopId }, notifiedAt: null },
                    _count: { productId: true }
                })
            ]);

        const productsById = new Map(products.map((p) => [p.id, p]));

        const completed = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
        const delivered = orders.filter((o) => o.status === 'DELIVERED');
        const cancelled = orders.filter((o) => o.status === 'CANCELLED');
        const active = orders.filter((o) => o.status !== 'CANCELLED');

        const revenue = active.reduce((s, o) => s + o.total, 0);
        const discountTotal = active.reduce((s, o) => s + (o.discount || 0), 0);
        const avgCheck = active.length ? Math.round(revenue / active.length) : 0;
        const conversion = orders.length
            ? Math.round((completed.length / orders.length) * 100)
            : 0;
        const cancelRate = orders.length
            ? Math.round((cancelled.length / orders.length) * 100)
            : 0;

        const prevActive = prevOrders.filter((o) => o.status !== 'CANCELLED');
        const prevRevenue = prevActive.reduce((s, o) => s + o.total, 0);

        const { uniqueCustomers, repeatCustomers, repeatRate } = customerStats(orders);

        const pickupCount = active.filter((o) => o.isPickup).length;
        const deliveryCount = active.length - pickupCount;
        const promoOrders = active.filter((o) => o.promoCode).length;
        const promoUsageRate = active.length
            ? Math.round((promoOrders / active.length) * 100)
            : 0;

        const reviewCount = reviews.length;
        const avgRating =
            reviewCount > 0
                ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
                : null;

        const hourly = buildHourlyDistribution(orders);
        const peakHourEntry = [...hourly].sort((a, b) => b.orders - a.orders)[0];
        const peakHour =
            peakHourEntry?.orders > 0 ? peakHourEntry.hour : null;

        const lowStock = products
            .filter(
                (p) =>
                    p.status === 'ACTIVE' &&
                    p.stock != null &&
                    p.stock <= 5 &&
                    !p.isOutOfStock
            )
            .map((p) => ({ id: p.id, name: p.name, stock: p.stock }))
            .slice(0, 8);

        const outOfStockCount = products.filter(
            (p) => p.status === 'ACTIVE' && (p.isOutOfStock || p.stock === 0)
        ).length;

        const wishlistTop = wishlistGrouped.map((w) => {
            const p = productsById.get(w.productId);
            return {
                productId: w.productId,
                name: p?.name || `Товар #${w.productId}`,
                count: w._count.productId
            };
        });

        const stockAlertCount = stockAlertsGrouped.reduce(
            (s, g) => s + g._count.productId,
            0
        );
        const stockAlertsTop = stockAlertsGrouped
            .map((g) => {
                const p = productsById.get(g.productId);
                return {
                    productId: g.productId,
                    name: p?.name || `Товар #${g.productId}`,
                    waiting: g._count.productId
                };
            })
            .sort((a, b) => b.waiting - a.waiting)
            .slice(0, 5);

        const topProducts = aggregateTopProducts(orders);
        const categories = aggregateCategories(orders, productsById);

        const insights = buildInsights({
            cancelRate,
            conversion,
            repeatRate,
            avgRating,
            reviewCount,
            topProducts,
            lowStock,
            stockAlertCount,
            promoUsageRate,
            peakHour,
            deliveredCount: delivered.length,
            totalOrders: orders.length,
            uniqueCustomers
        });

        const chart = buildChart(orders, period);

        res.json({
            summary: {
                totalOrders: orders.length,
                activeOrders: active.length,
                deliveredOrders: delivered.length,
                cancelledOrders: cancelled.length,
                revenue,
                revenueChange: periodDelta(revenue, prevRevenue),
                ordersChange: periodDelta(active.length, prevActive.length),
                avgCheck,
                conversion,
                cancelRate,
                discountTotal,
                uniqueCustomers,
                repeatCustomers,
                repeatRate,
                avgRating,
                reviewCount,
                pickupCount,
                deliveryCount,
                promoOrders,
                promoUsageRate,
                outOfStockCount
            },
            chart,
            statusBreakdown: buildStatusBreakdown(orders),
            hourly,
            topProducts,
            categories,
            reviews: reviews.slice(0, 5).map((r) => ({
                rating: r.rating,
                text: r.text,
                createdAt: r.createdAt
            })),
            wishlistTop,
            stockAlertsTop,
            stockAlertCount,
            lowStock,
            insights,
            period,
            windowDays
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка аналитики' });
    }
});

export default router;
