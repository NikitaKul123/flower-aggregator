import { Link } from 'react-router-dom';
import { mediaUrl } from '../utils/media';

function PriceRow({ row, currentPrice, isCurrent }) {
    return (
        <tr className={isCurrent ? 'border-t bg-pink-50/60' : 'border-t border-gray-50'}>
            <td className="p-4">
                <div className="flex items-center gap-2">
                    {row.shop?.avatar && (
                        <img
                            src={mediaUrl(row.shop.avatar)}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    )}
                    <span className="font-medium">
                        {row.shop?.name}
                        {isCurrent && (
                            <span className="text-pink-600 text-xs font-normal ml-1">(вы здесь)</span>
                        )}
                    </span>
                </div>
            </td>
            <td className="p-4">
                <span className={`font-bold ${isCurrent ? 'text-pink-600' : 'text-gray-900'}`}>
                    {row.price.toLocaleString('ru-RU')} ₽
                </span>
                {!isCurrent && row.price < currentPrice && (
                    <span className="ml-2 text-green-600 text-xs font-medium">
                        −{(currentPrice - row.price).toLocaleString('ru-RU')} ₽
                    </span>
                )}
            </td>
            <td className="p-4 text-gray-600 text-sm">{row.shop?.deliveryTime || '—'}</td>
            <td className="p-4 text-right">
                {!isCurrent && (
                    <Link to={`/product/${row.id}`} className="text-pink-600 hover:underline text-sm font-medium">
                        Открыть
                    </Link>
                )}
            </td>
        </tr>
    );
}

const MATCH_HINTS = {
    name: 'Тот же букет по названию в других магазинах',
    fuzzy: 'Похожие названия в других магазинах',
    category: 'Другие букеты в той же категории'
};

export default function PriceCompareSection({ product, compare }) {
    if (!product || !compare) return null;

    const alternatives = compare.alternatives || [];
    const similar = compare.similar || [];
    const rows = alternatives.length ? alternatives : similar;
    const matchType = compare.matchType || (alternatives.length ? 'name' : similar.length ? 'category' : 'none');

    return (
        <section className="mt-16" id="price-compare">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Сравнение цен</h2>
            <p className="text-gray-500 text-sm mb-6">
                {MATCH_HINTS[matchType] || 'Сравнение с другими магазинами на платформе'}
            </p>

            {rows.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                    <table className="w-full text-sm bg-white">
                        <thead className="bg-gray-50 text-left text-gray-500">
                            <tr>
                                <th className="p-4 font-medium">Магазин</th>
                                <th className="p-4 font-medium">Цена</th>
                                <th className="p-4 font-medium">Доставка</th>
                                <th className="p-4 font-medium" />
                            </tr>
                        </thead>
                        <tbody>
                            <PriceRow row={product} currentPrice={product.price} isCurrent />
                            {rows.map(alt => (
                                <PriceRow
                                    key={alt.id}
                                    row={alt}
                                    currentPrice={product.price}
                                    isCurrent={false}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-600 text-sm">
                    Пока нет других предложений с таким названием или в этой категории.
                    Загляните в раздел «Похожие товары» ниже.
                </div>
            )}
        </section>
    );
}
