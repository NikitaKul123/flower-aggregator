import { ORDER_STATUS_LABELS } from './orderStatusLabels.js';

export const PLATFORM_STATUS_LABELS = {
    ...ORDER_STATUS_LABELS,
    PENDING: 'Новые',
    CONFIRMED: 'Подтверждены',
    ASSEMBLING: 'Сборка',
    READY: 'Готовы',
    DELIVERING: 'Доставка',
    DELIVERED: 'Доставлены',
    NO_CONTACT: 'Не дозвонились',
    CANCELLED: 'Отменены'
};

export function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function startOfWeek(d) {
    const x = startOfDay(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
}

function dateKey(d) {
    return startOfDay(d).toISOString().slice(0, 10);
}

export function parseDateRange(query) {
    const today = startOfDay(new Date());
    let dateTo = query.dateTo ? startOfDay(new Date(query.dateTo)) : today;
    let dateFrom = query.dateFrom
        ? startOfDay(new Date(query.dateFrom))
        : new Date(today);

    if (!query.dateFrom) {
        dateFrom.setDate(dateFrom.getDate() - 29);
    }

    dateTo.setHours(23, 59, 59, 999);

    const prevSpan = dateTo.getTime() - dateFrom.getTime();
    const prevTo = new Date(dateFrom.getTime() - 1);
    prevTo.setHours(23, 59, 59, 999);
    const prevFrom = new Date(prevTo.getTime() - prevSpan);
    prevFrom.setHours(0, 0, 0, 0);

    return { dateFrom, dateTo, prevFrom, prevTo };
}

export function buildTimeChart(orders, period) {
    const count = period === 'week' ? 12 : 30;
    const today = startOfDay(new Date());
    const points = [];

    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(today);
        if (period === 'week') {
            d.setDate(d.getDate() - i * 7);
            points.push({ date: dateKey(startOfWeek(d)), orders: 0, revenue: 0 });
        } else {
            d.setDate(d.getDate() - i);
            points.push({ date: dateKey(d), orders: 0, revenue: 0 });
        }
    }

    const byDate = new Map(points.map((p) => [p.date, p]));
    for (const o of orders) {
        const key = period === 'week' ? dateKey(startOfWeek(o.createdAt)) : dateKey(o.createdAt);
        const bucket = byDate.get(key);
        if (!bucket) continue;
        bucket.orders += 1;
        if (o.status !== 'CANCELLED') bucket.revenue += o.total;
    }

    return points;
}

export function aggregateShops(orders) {
    const map = new Map();
    for (const o of orders) {
        const sid = o.shopId;
        if (!map.has(sid)) {
            map.set(sid, {
                shopId: sid,
                shopName: o.shop?.name || `Магазин #${sid}`,
                orders: 0,
                revenue: 0,
                delivered: 0,
                cancelled: 0
            });
        }
        const row = map.get(sid);
        row.orders += 1;
        if (o.status === 'CANCELLED') row.cancelled += 1;
        else {
            row.revenue += o.total;
            if (o.status === 'DELIVERED') row.delivered += 1;
        }
    }

    return Array.from(map.values())
        .map((s) => ({
            ...s,
            avgCheck: s.delivered > 0 ? Math.round(s.revenue / Math.max(s.delivered, 1)) : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);
}

export function buildSummary(orders, allCustomers, periodOrders) {
    const totalOrders = orders.length;
    const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
    const noContact = orders.filter((o) => o.status === 'NO_CONTACT').length;
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
    const revenueOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const revenue = revenueOrders.reduce((s, o) => s + o.total, 0);
    const delivery = orders.filter((o) => !o.isPickup).length;
    const pickup = orders.filter((o) => o.isPickup).length;
    const buyers = new Set(periodOrders.map((o) => o.userId)).size;

    return {
        totalOrders,
        revenue,
        delivered,
        cancelled,
        noContact,
        cancelRate: totalOrders ? Math.round((cancelled / totalOrders) * 100) : 0,
        noContactRate: totalOrders ? Math.round((noContact / totalOrders) * 100) : 0,
        avgCheck: delivered > 0 ? Math.round(revenue / delivered) : revenueOrders.length
            ? Math.round(revenue / revenueOrders.length)
            : 0,
        deliveryOrders: delivery,
        pickupOrders: pickup,
        deliveryShare: totalOrders ? Math.round((delivery / totalOrders) * 100) : 0,
        uniqueBuyers: buyers,
        totalCustomers: allCustomers,
        conversionRate: allCustomers > 0 ? Math.round((buyers / allCustomers) * 100) : 0
    };
}

export function buildStatusBreakdown(orders) {
    const counts = {};
    for (const o of orders) {
        counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return Object.entries(counts)
        .map(([status, count]) => ({
            status,
            label: PLATFORM_STATUS_LABELS[status] || status,
            count
        }))
        .sort((a, b) => b.count - a.count);
}

export function buildInsights(summary, shops, chart) {
    const tips = [];

    if (summary.totalOrders === 0) {
        tips.push({
            type: 'info',
            text: 'За период нет заказов — проверьте активность магазинов и модерацию новых партнёров.'
        });
        return tips;
    }

    if (summary.cancelRate >= 12) {
        tips.push({
            type: 'warning',
            text: `Доля отмен ${summary.cancelRate}% — стоит разобрать причины с магазинами с высоким процентом отмен.`
        });
    }

    if (summary.noContactRate >= 8) {
        tips.push({
            type: 'warning',
            text: `${summary.noContactRate}% заказов со статусом «Не дозвонился» — уточните качество контактов клиентов.`
        });
    }

    const lastPoints = chart.slice(-7);
    const prevPoints = chart.slice(-14, -7);
    const lastRev = lastPoints.reduce((s, p) => s + p.revenue, 0);
    const prevRev = prevPoints.reduce((s, p) => s + p.revenue, 0);
    if (prevRev > 0 && lastRev > prevRev * 1.15) {
        tips.push({
            type: 'success',
            text: 'Оборот за последнюю неделю вырос более чем на 15% — платформа растёт.'
        });
    } else if (prevRev > 0 && lastRev < prevRev * 0.85) {
        tips.push({
            type: 'warning',
            text: 'Оборот за последнюю неделю снизился — посмотрите аутсайдеров среди магазинов.'
        });
    }

    if (shops.length >= 2) {
        const top = shops[0];
        const bottom = shops[shops.length - 1];
        if (top.revenue > 0 && bottom.revenue === 0 && bottom.orders > 0) {
            tips.push({
                type: 'info',
                text: `«${bottom.shopName}» принимает заказы, но мало доставляет — возможны проблемы с исполнением.`
            });
        }
        if (top.shopName) {
            tips.push({
                type: 'success',
                text: `Лидер оборота: «${top.shopName}» (${top.revenue.toLocaleString('ru-RU')} ₽).`
            });
        }
    }

    if (summary.deliveryShare > 70) {
        tips.push({
            type: 'info',
            text: `${summary.deliveryShare}% заказов — доставка. Убедитесь, что курьеры и маршруты справляются с нагрузкой.`
        });
    }

    if (summary.conversionRate < 5 && summary.totalCustomers > 20) {
        tips.push({
            type: 'warning',
            text: 'Низкая конверсия регистраций в заказы — усильте витрину и онбординг клиентов.'
        });
    }

    return tips.slice(0, 6);
}

export function ordersToCsv(shops, summary, rangeLabel) {
    const header = [
        'Период',
        'Магазин',
        'Заказов',
        'Оборот ₽',
        'Доставлено',
        'Отменено',
        'Средний чек ₽'
    ];
    const rows = shops.map((s) => [
        rangeLabel,
        s.shopName,
        s.orders,
        s.revenue,
        s.delivered,
        s.cancelled,
        s.avgCheck
    ]);
    const totalRow = [
        rangeLabel,
        'ИТОГО',
        summary.totalOrders,
        summary.revenue,
        summary.delivered,
        summary.cancelled,
        summary.avgCheck
    ];
    return [header, ...rows.map((r) => r), totalRow]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
}
