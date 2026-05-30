import { Link } from 'react-router-dom';
import { productImageUrl } from '../utils/productImage';
import { mediaUrl } from '../utils/media';
import { shopRatingStars } from '../utils/shopRating';

export default function ProductCatalogCard({
    product,
    inStock,
    isShop,
    wishlist,
    toggleWishlist,
    addToCart,
    productTo = `/product/${product.id}`,
    productLinkState,
    hideShop = false
}) {
    const isWishlisted = wishlist.some(i => i.id === product.id);

    return (
        <article
            className={`group relative flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden bg-white border transition-all duration-300 ${
                inStock
                    ? 'border-gray-100/80 shadow-sm sm:hover:shadow-xl sm:hover:shadow-pink-500/10 sm:hover:-translate-y-1'
                    : 'border-gray-200/90 shadow-sm opacity-[0.97]'
            }`}
        >
            <Link
                to={productTo}
                state={productLinkState}
                className="block relative aspect-[4/5] overflow-hidden bg-gray-100"
            >
                <img
                    src={productImageUrl(product)}
                    alt={product.name}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${
                        inStock ? 'group-hover:scale-105' : 'scale-100 opacity-55 grayscale'
                    }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pointer-events-none" />

                {product.category && (
                    <span className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm">
                        {product.category}
                    </span>
                )}

                {!inStock && (
                    <span className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-gray-900/85 text-white backdrop-blur-sm">
                        Нет в наличии
                    </span>
                )}

                <span className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-10 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md text-pink-600 font-bold text-sm sm:text-lg shadow-md">
                    {product.price.toLocaleString('ru-RU')} ₽
                </span>
            </Link>

            {!isShop && (
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
                    className={`absolute bottom-11 right-2 sm:bottom-14 sm:right-3 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full backdrop-blur-md shadow flex items-center justify-center text-base sm:text-lg transition-transform active:scale-95 sm:hover:scale-110 ${
                        isWishlisted ? 'bg-pink-500 text-white' : 'bg-white/90 text-gray-500'
                    }`}
                    aria-label="В избранное"
                >
                    {isWishlisted ? '❤️' : '♡'}
                </button>
            )}

            <div className="p-3 sm:p-5 flex flex-col flex-1">
                {!hideShop && product.shop && (
                    <Link
                        to={`/catalog/${product.shop.id}`}
                        state={{ shopName: product.shop.name }}
                        className="inline-flex items-center gap-1.5 mb-2 sm:mb-3 w-fit group/shop max-w-full"
                    >
                        {product.shop.avatar ? (
                            <img
                                src={mediaUrl(product.shop.avatar)}
                                alt=""
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover ring-1 sm:ring-2 ring-white shadow"
                            />
                        ) : (
                            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shadow">
                                {product.shop.name?.[0]}
                            </span>
                        )}
                        <span className="text-[11px] sm:text-xs font-medium text-gray-500 group-hover/shop:text-pink-600 truncate transition-colors">
                            {product.shop.name}
                        </span>
                        {shopRatingStars(product.shop) && (
                            <span className="text-[10px] sm:text-xs text-amber-500 shrink-0">{shopRatingStars(product.shop)}</span>
                        )}
                    </Link>
                )}

                <Link to={productTo} state={productLinkState} className="flex-1 min-h-0">
                    <h2 className="font-semibold text-gray-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-pink-600 transition-colors">
                        {product.name}
                    </h2>
                </Link>

                {!isShop && (
                    <div className="flex gap-1.5 sm:gap-2 mt-2.5 sm:mt-4 pt-2.5 sm:pt-4 border-t border-gray-100">
                        {inStock ? (
                            <button
                                type="button"
                                onClick={() => addToCart(product)}
                                className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs sm:text-sm font-semibold py-2.5 sm:py-3 rounded-xl sm:rounded-2xl sm:hover:from-pink-700 sm:hover:to-rose-700 sm:shadow-md sm:shadow-pink-500/20 transition active:scale-[0.98]"
                            >
                                В корзину
                            </button>
                        ) : (
                            <Link
                                to={productTo}
                                state={productLinkState}
                                className="flex-1 text-center bg-gray-900 text-white text-xs sm:text-sm font-semibold py-2.5 sm:py-3 rounded-xl sm:rounded-2xl sm:hover:bg-gray-800 transition"
                            >
                                🔔 Уведомить
                            </Link>
                        )}
                        <Link
                            to={productTo}
                            state={productLinkState}
                            className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl border border-gray-200 text-gray-600 sm:hover:border-pink-300 sm:hover:text-pink-600 sm:hover:bg-pink-50 transition"
                            title="Подробнее"
                        >
                            →
                        </Link>
                    </div>
                )}
            </div>
        </article>
    );
}
