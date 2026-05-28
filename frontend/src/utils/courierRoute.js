/** Собрать маршрут из уже загруженных заказов — без ожидания API. */
export function courierRouteFromOrders(orders, shop) {
    const stops = (orders || [])
        .filter(o => !o.isPickup)
        .map(o => {
            const info = o.deliveryInfo && typeof o.deliveryInfo === 'object' ? o.deliveryInfo : {};
            return {
                orderId: o.id,
                status: o.status,
                address: info.address || null,
                phone: info.phone || null,
                name: info.name || null,
                lat: info.lat != null ? Number(info.lat) : null,
                lng: info.lng != null ? Number(info.lng) : null
            };
        });

    const addressParts = stops.map(s => s.address).filter(Boolean);
    const yandexRouteUrl = addressParts.length >= 2
        ? `https://yandex.ru/maps/?rtext=${addressParts.map(encodeURIComponent).join('~')}&rtt=auto`
        : addressParts[0]
            ? `https://yandex.ru/maps/?text=${encodeURIComponent(addressParts[0])}`
            : null;

    return {
        shop: shop
            ? { name: shop.name, address: shop.address, lat: null, lng: null }
            : null,
        stops,
        yandexRouteUrl
    };
}
