const cache = new Map();
let lastRequestAt = 0;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function nominatimSearch(query) {
    const q = (query || '').trim();
    if (!q) return null;

    const key = q.toLowerCase();
    if (cache.has(key)) return cache.get(key);

    const wait = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (wait > 0) await delay(wait);
    lastRequestAt = Date.now();

    try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', q);
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '1');
        url.searchParams.set('countrycodes', 'ru');

        const res = await fetch(url, {
            headers: { 'User-Agent': 'FlowerAggregator/1.0 (courier-delivery)' }
        });
        if (!res.ok) return null;

        const data = await res.json();
        if (!data?.[0]) return null;

        const coords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };
        if (Number.isNaN(coords.lat) || Number.isNaN(coords.lng)) return null;

        cache.set(key, coords);
        return coords;
    } catch (e) {
        console.warn('geocode failed:', e.message);
        return null;
    }
}

/**
 * @param {string} address
 * @param {string} [context] — город/адрес магазина для уточнения «улица, дом»
 */
export async function geocodeAddress(address, context = '') {
    const base = (address || '').trim();
    if (!base) return null;

    const ctx = (context || '').trim();
    const variants = [base];
    if (ctx && !base.toLowerCase().includes(ctx.toLowerCase().slice(0, 12))) {
        variants.push(`${base}, ${ctx}`);
    }
    variants.push(`${base}, Россия`);

    for (const query of variants) {
        const coords = await nominatimSearch(query);
        if (coords) return coords;
    }
    return null;
}

/**
 * @param {object} order
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @param {string} [shopContext]
 */
export async function resolveOrderCoords(order, prisma, shopContext = '') {
    const info = order.deliveryInfo && typeof order.deliveryInfo === 'object'
        ? { ...order.deliveryInfo }
        : {};

    if (info.lat != null && info.lng != null) {
        return { lat: Number(info.lat), lng: Number(info.lng), cached: true };
    }

    const coords = await geocodeAddress(info.address, shopContext);
    if (!coords) return null;

    if (prisma) {
        await prisma.order.update({
            where: { id: order.id },
            data: {
                deliveryInfo: { ...info, lat: coords.lat, lng: coords.lng }
            }
        });
    }

    return { ...coords, cached: false };
}
