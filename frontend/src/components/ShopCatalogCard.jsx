import { Link } from 'react-router-dom';
import { mediaUrl } from '../utils/media';
import { shopRatingStars } from '../utils/shopRating';
import { catalogPath } from '../utils/navigationPaths';
import ShopActionButtons from './ShopActionButtons';

function ShopMetaBadges({ shop }) {
    const chip = 'text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md';

    return (
        <div className="flex flex-wrap items-center gap-1">
            {shopRatingStars(shop) ? (
                <span className={`${chip} bg-amber-50 text-amber-800`}>
                    {shopRatingStars(shop)}
                </span>
            ) : (
                <span className={`${chip} bg-gray-100 text-gray-500`}>Новый</span>
            )}
            {shop.isVerified && (
                <span className={`${chip} bg-emerald-50 text-emerald-700`}>✓ Проверен</span>
            )}
            {shop.sameDayDelivery !== false && (
                <span className={`${chip} bg-emerald-50 text-emerald-700`}>Сегодня</span>
            )}
            {shop.deliveryTime && (
                <span className={`${chip} bg-gray-100 text-gray-600`}>{shop.deliveryTime}</span>
            )}
        </div>
    );
}

export default function ShopCatalogCard({ shop }) {
    const catalogTo = catalogPath(shop.id, { fromShops: true });
    const linkState = { shopName: shop.name };
    const avatarUrl = mediaUrl(shop.avatar);

    return (
        <article className="group relative flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-gray-100/80 shadow-sm sm:hover:shadow-xl sm:hover:shadow-pink-500/10 sm:hover:-translate-y-1 transition-all duration-300">
            <Link
                to={catalogTo}
                state={linkState}
                className="block relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-orange-50"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-500 to-rose-600 text-white text-4xl sm:text-5xl font-bold">
                        {shop.name?.[0] || '?'}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />

                {shop.isVerified && (
                    <span className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/95 text-emerald-700 backdrop-blur-sm">
                        ✓ Проверен
                    </span>
                )}

                <div
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex gap-1.5"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                >
                    <ShopActionButtons shop={shop} compact className="gap-1.5" />
                </div>
            </Link>

            <div className="p-3 sm:p-5 flex flex-col flex-1">
                <Link to={catalogTo} state={linkState} className="flex-1 min-h-0">
                    <h2 className="font-semibold text-gray-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-pink-600 transition-colors">
                        {shop.name}
                    </h2>
                </Link>
                {shop.address && (
                    <p className="text-[11px] sm:text-xs text-gray-500 mt-1 line-clamp-1">{shop.address}</p>
                )}
                <div className="mt-2">
                    <ShopMetaBadges shop={shop} />
                </div>
                <Link
                    to={catalogTo}
                    state={linkState}
                    className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-gray-100 text-center text-xs sm:text-sm font-semibold text-pink-600 py-2 rounded-xl bg-pink-50/80 sm:hover:bg-pink-100 transition active:scale-[0.98]"
                >
                    Смотреть каталог →
                </Link>
            </div>
        </article>
    );
}
