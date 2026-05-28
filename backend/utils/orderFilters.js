export function buildOrderWhere(query, baseWhere = {}) {
    const where = { ...baseWhere };

    if (query.status && query.status !== 'ALL') {
        where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
        where.createdAt = {};
        if (query.dateFrom) {
            where.createdAt.gte = new Date(query.dateFrom);
        }
        if (query.dateTo) {
            const end = new Date(query.dateTo);
            end.setHours(23, 59, 59, 999);
            where.createdAt.lte = end;
        }
    }

    if (query.minTotal) {
        where.total = { ...(where.total || {}), gte: Number(query.minTotal) };
    }
    if (query.maxTotal) {
        where.total = { ...(where.total || {}), lte: Number(query.maxTotal) };
    }

    return where;
}

export function matchesSearch(order, search, isShop = false) {
    const s = (search || '').trim().toLowerCase();
    if (!s) return true;

    if (String(order.id).includes(s)) return true;

    if (isShop) {
        const name = (order.deliveryInfo?.name || order.user?.name || '').toLowerCase();
        const phone = (order.deliveryInfo?.phone || order.user?.phone || '').toLowerCase();
        if (name.includes(s) || phone.includes(s)) return true;
    }

    return false;
}

import { ORDER_STATUS_LABELS as STATUS_LABELS } from './orderStatusLabels.js';

function deliverySchedule(d) {
    const parts = [];
    if (d.deliveryDate) parts.push(String(d.deliveryDate).slice(0, 10));
    if (d.deliverySlotLabel) parts.push(d.deliverySlotLabel);
    return parts.join(' ');
}

export function orderToCsvRow(order) {
    const d = order.deliveryInfo || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsSummary = items.map(i => `${i.name}×${i.quantity || 1}`).join('; ');
    return [
        order.id,
        STATUS_LABELS[order.status] || order.status,
        order.total,
        order.discount || 0,
        order.promoCode || '',
        order.isPickup ? 'Самовывоз' : 'Доставка',
        d.name || order.user?.name || '',
        d.phone || order.user?.phone || '',
        d.address || '',
        deliverySchedule(d),
        itemsSummary,
        order.shopNotes || '',
        new Date(order.createdAt).toISOString()
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
}

export const CSV_HEADER =
    'id,status,total,discount,promoCode,deliveryType,name,phone,address,deliverySlot,items,shopNotes,createdAt';
