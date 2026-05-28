import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { productImageUrl } from '../utils/productImage';
import { mediaUrl } from '../utils/media';
import { catalogPath } from '../utils/navigationPaths';
import ShopActionButtons from '../components/ShopActionButtons';
import Avatar from '../components/Avatar';
import { cardClass } from '../utils/ui';

function Wishlist() {
    const {
        wishlist,
        favoriteShops,
        removeFromWishlist,
        addToCart,
        toggleShopFavorite
    } = useContext(CartContext);

    const empty = wishlist.length === 0 && favoriteShops.length === 0;

    if (empty) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
                <div className="text-7xl mb-6">♡</div>
                <h2 className="text-4xl font-bold mb-4">Избранное пусто</h2>
                <p className="text-gray-600 mb-10 max-w-md">
                    Добавляйте букеты и магазины в избранное, подписывайтесь на магазины — узнаете о новинках первыми
                </p>
                <Link
                    to="/"
                    className="bg-pink-600 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:bg-pink-700"
                >
                    На главную
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            <h1 className="text-4xl font-bold mb-10 flex items-center gap-3 flex-wrap">
                ♡ Избранное
                <span className="text-lg font-normal text-gray-400">
                    {wishlist.length} товар(ов) · {favoriteShops.length} магазин(ов)
                </span>
            </h1>

            {favoriteShops.length > 0 && (
                <section className="mb-14">
                    <h2 className="text-2xl font-semibold mb-6">Магазины</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favoriteShops.map(shop => (
                            <article key={shop.id} className={`${cardClass} overflow-hidden flex flex-col`}>
                                <Link
                                    to={catalogPath(shop.id)}
                                    state={{ shopName: shop.name }}
                                    className="block h-40 bg-gradient-to-br from-pink-50 to-rose-100 relative overflow-hidden"
                                >
                                    {shop.avatar ? (
                                        <img
                                            src={mediaUrl(shop.avatar)}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full flex items-center justify-center">
                                            <Avatar src={null} name={shop.name} size="lg" />
                                        </div>
                                    )}
                                </Link>
                                <div className="p-5 flex flex-col flex-1">
                                    <Link
                                        to={catalogPath(shop.id)}
                                        state={{ shopName: shop.name }}
                                        className="font-semibold text-lg hover:text-pink-600"
                                    >
                                        {shop.name}
                                    </Link>
                                    {shop.address && (
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{shop.address}</p>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <ShopActionButtons shop={shop} />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleShopFavorite(shop)}
                                        className="mt-4 text-sm text-red-500 hover:text-red-600 text-left"
                                    >
                                        Убрать из избранного
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {wishlist.length > 0 && (
                <section>
                    <h2 className="text-2xl font-semibold mb-6">Товары</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {wishlist.map(product => (
                            <div key={product.id} className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-md hover:shadow-lg transition border border-gray-100">
                                <Link to={`/product/${product.id}`}>
                                    <img
                                        src={productImageUrl(product)}
                                        alt={product.name}
                                        className="w-full h-64 object-cover"
                                    />
                                </Link>
                                <div className="p-6">
                                    <Link to={`/product/${product.id}`} className="font-semibold text-lg mb-2 line-clamp-2 hover:text-pink-600 block">
                                        {product.name}
                                    </Link>
                                    <p className="text-3xl font-bold text-pink-600 mb-6">
                                        {product.price.toLocaleString('ru-RU')} ₽
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => addToCart(product)}
                                            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-4 rounded-2xl transition"
                                        >
                                            В корзину
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeFromWishlist(product.id)}
                                            className="flex-1 border border-red-500 text-red-500 hover:bg-red-50 font-semibold py-4 rounded-2xl transition"
                                        >
                                            Убрать
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

export default Wishlist;
