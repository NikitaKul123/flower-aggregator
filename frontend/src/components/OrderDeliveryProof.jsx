import { mediaUrl } from '../utils/media';

export default function OrderDeliveryProof({ order }) {
    if (!order?.deliveryPhoto && !order?.recipientSignature) return null;

    return (
        <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                Подтверждение доставки
            </h3>
            {order.recipientName && (
                <p className="text-sm text-gray-700 mb-2">
                    Получатель: <span className="font-medium">{order.recipientName}</span>
                </p>
            )}
            {order.deliveredAt && (
                <p className="text-xs text-gray-500 mb-3">
                    {new Date(order.deliveredAt).toLocaleString('ru-RU')}
                </p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
                {order.deliveryPhoto && (
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Фото доставки</p>
                        <a href={mediaUrl(order.deliveryPhoto)} target="_blank" rel="noopener noreferrer">
                            <img
                                src={mediaUrl(order.deliveryPhoto)}
                                alt="Фото доставки"
                                className="w-full rounded-xl border border-gray-200 object-cover max-h-48"
                            />
                        </a>
                    </div>
                )}
                {order.recipientSignature && (
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Подпись получателя</p>
                        <img
                            src={mediaUrl(order.recipientSignature)}
                            alt="Подпись"
                            className="w-full rounded-xl border border-gray-200 bg-white max-h-48 object-contain"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
