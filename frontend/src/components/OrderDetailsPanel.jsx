import { productImageUrl } from '../utils/productImage';
import OrderDeliveryProof from './OrderDeliveryProof';

function DeliveryScheduleCard({ summary }) {
    if (!summary || summary.mode === 'pickup') {
        return (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3">
                <span className="text-2xl" aria-hidden>🏪</span>
                <div>
                    <p className="font-semibold text-gray-900">Самовывоз</p>
                    <p className="text-sm text-gray-600 mt-0.5">Клиент заберёт заказ в магазине</p>
                </div>
            </div>
        );
    }

    const hasSchedule = summary.dateLabel || summary.slot;

    return (
        <div className="rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 border border-pink-100 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-700 mb-2">
                Время доставки
            </p>
            {hasSchedule ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {summary.dateLabel && (
                        <p className="text-lg sm:text-xl font-bold text-gray-900">{summary.dateLabel}</p>
                    )}
                    {summary.slot && (
                        <p className="text-base font-semibold text-pink-700">{summary.slot}</p>
                    )}
                </div>
            ) : (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                    Дата и интервал не указаны — уточните у клиента в чате
                </p>
            )}
        </div>
    );
}

function ContactLines({ lines }) {
    if (!lines?.length) return null;
    return (
        <ul className="space-y-2 text-sm text-gray-700">
            {lines
                .filter(l => !l.highlight && !l.gift)
                .map((line, i) => (
                    <li key={i} className="flex gap-2">
                        <span className="shrink-0" aria-hidden>{line.icon}</span>
                        <span className="break-words">{line.text}</span>
                    </li>
                ))}
        </ul>
    );
}

/**
 * @param {object} props
 * @param {object} props.order
 * @param {object} props.summary — из getOrderDeliverySummary
 * @param {Array} [props.statusHistory]
 * @param {object} [props.statusLabels]
 * @param {React.ReactNode} [props.extraSections] — отзыв, курьер и т.д.
 */
export default function OrderDetailsPanel({
    order,
    summary,
    statusHistory = [],
    statusLabels = {},
    extraSections = null
}) {
    const giftLine = summary?.lines?.find(l => l.gift);

    return (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-6">
            <DeliveryScheduleCard summary={summary} />

            <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                    Состав заказа
                </h3>
                <ul className="space-y-3">
                    {order.items?.map(item => (
                        <li
                            key={item.id}
                            className="flex gap-3 sm:gap-4 p-3 rounded-2xl bg-gray-50/80 border border-gray-100"
                        >
                            <img
                                src={item.image || productImageUrl(item)}
                                alt=""
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900">{item.name}</p>
                                {item.category && (
                                    <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                                )}
                                <p className="text-pink-600 font-semibold mt-1">
                                    {Number(item.price).toLocaleString('ru-RU')} ₽
                                    {item.quantity > 1 && (
                                        <span className="text-gray-500 font-normal text-sm">
                                            {' '}× {item.quantity}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {summary?.mode === 'delivery' && (
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                        Получатель
                    </h3>
                    <ContactLines lines={summary.lines} />
                </div>
            )}

            {giftLine && (
                <p className="text-sm text-pink-900 bg-pink-50 rounded-xl p-3 border border-pink-100">
                    {giftLine.icon} {giftLine.text}
                </p>
            )}

            {order.promoCode && (
                <p className="text-sm text-gray-600">
                    Промокод: <span className="font-medium">{order.promoCode}</span>
                    {order.discount > 0 && (
                        <span className="text-green-600 ml-2">
                            −{Number(order.discount).toLocaleString('ru-RU')} ₽
                        </span>
                    )}
                </p>
            )}

            {extraSections}

            <OrderDeliveryProof order={order} />

            {statusHistory.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                        История статусов
                    </h3>
                    <ul className="space-y-2 text-sm">
                        {statusHistory.map(h => (
                            <li key={h.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="font-medium text-gray-900">
                                    {h.fromStatus ? statusLabels[h.fromStatus] || h.fromStatus : '—'} →{' '}
                                    {statusLabels[h.toStatus] || h.toStatus}
                                </div>
                                <div className="text-gray-500 text-xs mt-1">
                                    {h.changedBy?.name} ·{' '}
                                    {new Date(h.createdAt).toLocaleString('ru-RU')}
                                </div>
                                {h.comment && (
                                    <div className="text-gray-600 mt-1">💬 {h.comment}</div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function OrderDeliveryBadge({ summary }) {
    if (!summary?.shortLabel) return null;
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-800 bg-pink-50 border border-pink-100 px-2.5 py-1 rounded-full mt-2">
            <span aria-hidden>📅</span>
            {summary.shortLabel}
        </span>
    );
}
