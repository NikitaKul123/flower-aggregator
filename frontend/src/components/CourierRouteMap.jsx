import { useEffect, useMemo, useState } from 'react';
import { fetchCourierMapRoute } from '../api/courierApi';
import { btnSecondary } from '../utils/ui';
import { ORDER_STATUS_LABELS } from '../utils/orderStatuses';
import { courierRouteFromOrders } from '../utils/courierRoute';

/** Виджет Яндекс.Карт — стабильно работает в РФ. */
export function buildYandexWidgetUrl(route) {
    if (!route) return null;

    const pts = [];

    if (route.shop?.lng != null && route.shop?.lat != null) {
        pts.push(`${route.shop.lng},${route.shop.lat},pm2grm`);
    }

    (route.stops || []).forEach((s) => {
        if (s.lng != null && s.lat != null) {
            pts.push(`${s.lng},${s.lat},pm2rdm`);
        }
    });

    if (pts.length) {
        const [lon, lat] = pts[0].split(',').map(Number);
        const z = pts.length > 2 ? 11 : pts.length > 1 ? 12 : 15;
        return `https://yandex.ru/map-widget/v1/?ll=${lon},${lat}&z=${z}&pt=${pts.join('~')}&lang=ru_RU`;
    }

    const firstAddr = route.stops?.find(s => s.address)?.address || route.shop?.address;
    if (firstAddr) {
        return `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(firstAddr)}&z=14&lang=ru_RU`;
    }

    return null;
}

function routeSubtitle(route, apiLoading) {
    const stops = route?.stops || [];
    if (!stops.length) return 'Нет активных доставок';

    const n = stops.length;
    const withCoords = stops.filter(s => s.lat != null && s.lng != null).length;
    const withAddress = stops.filter(s => s.address?.trim()).length;

    const orders =
        n === 1 ? '1 заказ' : n < 5 ? `${n} заказа` : `${n} заказов`;

    if (apiLoading) return `${orders} · открываем карту…`;
    if (withCoords > 0) return `${orders} · метки по координатам (${withCoords})`;
    if (withAddress > 0) return `${orders} · на карте по адресу доставки`;
    return `${orders} · укажите адрес в заказе`;
}

const IFRAME_HINT_MS = 4000;

export default function CourierRouteMap({ token, orders = [], shop = null, onClose }) {
    const instantRoute = useMemo(() => courierRouteFromOrders(orders, shop), [orders, shop]);
    const [route, setRoute] = useState(instantRoute);
    const [apiLoading, setApiLoading] = useState(true);
    const [error, setError] = useState(null);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [iframeHint, setIframeHint] = useState(false);

    const yandexWidgetUrl = buildYandexWidgetUrl(route);
    const stops = route?.stops || [];
    const subtitle = routeSubtitle(route, apiLoading);

    useEffect(() => {
        setRoute(instantRoute);
    }, [instantRoute]);

    useEffect(() => {
        let cancelled = false;
        setApiLoading(true);
        fetchCourierMapRoute(token)
            .then((data) => {
                if (!cancelled) setRoute(data);
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(
                        e.response?.data?.error
                        || 'Не удалось обновить маршрут — показана карта по списку заказов'
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setApiLoading(false);
            });
        return () => { cancelled = true; };
    }, [token]);

    useEffect(() => {
        setIframeLoaded(false);
        setIframeHint(false);
    }, [yandexWidgetUrl]);

    useEffect(() => {
        if (!yandexWidgetUrl || iframeLoaded) return undefined;
        const t = setTimeout(() => setIframeHint(true), IFRAME_HINT_MS);
        return () => clearTimeout(t);
    }, [yandexWidgetUrl, iframeLoaded]);

    const showMapOverlay = yandexWidgetUrl && !iframeLoaded && !iframeHint;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-start gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Маршрут по активным заказам</h2>
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {error && (
                        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">{error}</p>
                    )}

                    <div className="relative w-full h-56 sm:h-72 rounded-xl border border-gray-200 overflow-hidden bg-slate-100">
                        {yandexWidgetUrl ? (
                            <iframe
                                title="Карта маршрута"
                                src={yandexWidgetUrl}
                                className="absolute inset-0 w-full h-full border-0"
                                allowFullScreen
                                loading="eager"
                                referrerPolicy="no-referrer-when-downgrade"
                                onLoad={() => setIframeLoaded(true)}
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-gray-500">
                                Нет адресов для отображения на карте
                            </div>
                        )}
                        {showMapOverlay && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 text-sm text-gray-500 pointer-events-none">
                                Загрузка карты…
                            </div>
                        )}
                        {iframeHint && !iframeLoaded && yandexWidgetUrl && (
                            <div className="absolute inset-x-3 bottom-3 rounded-lg bg-white/95 border border-gray-200 px-3 py-2 text-xs text-gray-600 shadow-sm z-10">
                                Карта Яндекса подгружается в фоне. Можно пользоваться списком адресов ниже.
                            </div>
                        )}
                    </div>

                    {route?.yandexRouteUrl && (
                        <a
                            href={route.yandexRouteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${btnSecondary} inline-flex px-4 py-2 text-sm`}
                        >
                            Открыть маршрут в Яндекс.Картах
                        </a>
                    )}

                    <ol className="space-y-2">
                        {stops.map((stop, i) => (
                            <li
                                key={stop.orderId}
                                className="flex gap-3 text-sm p-3 rounded-xl bg-gray-50 border border-gray-100"
                            >
                                <span className="w-7 h-7 rounded-full bg-pink-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                    {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900">
                                        Заказ №{stop.orderId}
                                        <span className="ml-2 text-xs font-normal text-gray-500">
                                            {ORDER_STATUS_LABELS[stop.status] || stop.status}
                                        </span>
                                    </p>
                                    <p className="text-gray-600 mt-0.5 break-words">{stop.address || 'Адрес не указан'}</p>
                                    {stop.phone && (
                                        <a
                                            href={`tel:${stop.phone}`}
                                            className="text-pink-600 hover:underline mt-1 inline-block"
                                        >
                                            {stop.phone}
                                        </a>
                                    )}
                                    {stop.address && (
                                        <a
                                            href={`https://yandex.ru/maps/?text=${encodeURIComponent(stop.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-xs text-gray-500 hover:text-pink-600 mt-1"
                                        >
                                            Открыть адрес в Яндекс.Картах →
                                        </a>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>

                    {stops.length === 0 && (
                        <p className="text-center text-gray-500 py-6">Нет активных доставок для маршрута</p>
                    )}
                </div>
            </div>
        </div>
    );
}
