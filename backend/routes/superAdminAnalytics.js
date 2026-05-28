import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import {
    parseDateRange,
    buildTimeChart,
    aggregateShops,
    buildSummary,
    buildStatusBreakdown,
    buildInsights,
    ordersToCsv
} from '../utils/platformAnalytics.js';
const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, requireSuperAdmin);

async function loadAnalyticsData(query) {
    const period = query.period === 'week' ? 'week' : 'day';
    const { dateFrom, dateTo, prevFrom, prevTo } = parseDateRange(query);

    const orderInclude = {
        shop: { select: { id: true, name: true } }
    };

    const [orders, prevOrders, allCustomers] = await Promise.all([
        prisma.order.findMany({
            where: { createdAt: { gte: dateFrom, lte: dateTo } },
            include: orderInclude
        }),
        prisma.order.findMany({
            where: { createdAt: { gte: prevFrom, lte: prevTo } },
            include: orderInclude
        }),
        prisma.user.count({ where: { role: 'CUSTOMER' } })
    ]);

    const summary = buildSummary(orders, allCustomers, orders);
    const prevSummary = buildSummary(prevOrders, allCustomers, prevOrders);

    const shops = aggregateShops(orders);
    const chart = buildTimeChart(orders, period);
    const statusBreakdown = buildStatusBreakdown(orders);
    const insights = buildInsights(summary, shops, chart);

    const delta = (cur, prev) => {
        if (!prev) return cur > 0 ? 100 : 0;
        return Math.round(((cur - prev) / prev) * 100);
    };

    return {
        period,
        range: {
            from: dateFrom.toISOString().slice(0, 10),
            to: dateTo.toISOString().slice(0, 10)
        },
        summary: {
            ...summary,
            revenueDelta: delta(summary.revenue, prevSummary.revenue),
            ordersDelta: delta(summary.totalOrders, prevSummary.totalOrders)
        },
        chart,
        shopsTop: shops.slice(0, 10),
        shopsBottom: [...shops].reverse().slice(0, 5).filter((s) => s.orders > 0),
        statusBreakdown,
        fulfillment: [
            { label: 'Доставка', count: summary.deliveryOrders },
            { label: 'Самовывоз', count: summary.pickupOrders }
        ],
        conversion: {
            totalCustomers: summary.totalCustomers,
            buyersInPeriod: summary.uniqueBuyers,
            conversionRate: summary.conversionRate,
            cancelRate: summary.cancelRate,
            noContactRate: summary.noContactRate
        },
        insights
    };
}

router.get('/', async (req, res) => {
    try {
        const data = await loadAnalyticsData(req.query);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки аналитики' });
    }
});

router.get('/export', async (req, res) => {
    try {
        const { dateFrom, dateTo } = parseDateRange(req.query);
        const orders = await prisma.order.findMany({
            where: { createdAt: { gte: dateFrom, lte: dateTo } },
            include: { shop: { select: { id: true, name: true } } }
        });
        const allCustomers = await prisma.user.count({ where: { role: 'CUSTOMER' } });
        const summary = buildSummary(orders, allCustomers, orders);
        const shops = aggregateShops(orders);
        const rangeLabel = `${dateFrom.toISOString().slice(0, 10)} — ${dateTo.toISOString().slice(0, 10)}`;
        const csv = ordersToCsv(shops, summary, rangeLabel);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="platform-analytics-${dateFrom.toISOString().slice(0, 10)}.csv"`
        );
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка экспорта' });
    }
});

export default router;
