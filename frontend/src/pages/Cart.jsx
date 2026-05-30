import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { productImageUrl } from '../utils/productImage';
import { MobileStickyBar } from '../components/MobileStickyBar';

function Cart() {
    const { cart, removeFromCart, updateQuantity, clearCart, total } = useContext(CartContext);
    const navigate = useNavigate();

    if (cart.length === 0) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
                <div className="text-7xl mb-6">🛒</div>
                <h2 className="text-4xl font-bold mb-4">Корзина пуста</h2>
                <p className="text-gray-600 mb-10 max-w-md">
                    Добавьте красивые букеты из разных магазинов
                </p>
                <Link
                    to="/"
                    className="bg-pink-600 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:bg-pink-700 transition"
                >
                    Выбрать букеты
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-mobile-sticky lg:pb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-10">🛒 Ваша корзина</h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-6">
                    {cart.map((item) => {
                        const qty = item.quantity || 1;
                        const lineTotal = item.price * qty;
                        return (
                            <div
                                key={item.cartId}
                                className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 shadow-sm border border-gray-100"
                            >
                                <img
                                    src={productImageUrl(item)}
                                    alt={item.name}
                                    className="w-full sm:w-32 h-40 sm:h-32 object-cover rounded-xl sm:rounded-2xl"
                                />

                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold mb-1">{item.name}</h3>
                                    {item.shop && (
                                        <p className="text-gray-500 text-sm mb-3">{item.shop.name}</p>
                                    )}
                                    <p className="text-lg text-gray-600">
                                        {item.price.toLocaleString('ru-RU')} ₽ × {qty}
                                    </p>
                                    <p className="text-2xl font-bold text-pink-600 mt-1">
                                        {lineTotal.toLocaleString('ru-RU')} ₽
                                    </p>

                                    <div className="flex items-center gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.cartId, -1)}
                                            className="w-10 h-10 border-2 rounded-xl text-xl hover:bg-gray-100"
                                        >
                                            −
                                        </button>
                                        <span className="text-lg font-semibold w-8 text-center">{qty}</span>
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.cartId, 1)}
                                            className="w-10 h-10 border-2 rounded-xl text-xl hover:bg-gray-100"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeFromCart(item.cartId)}
                                    className="text-red-500 hover:text-red-700 text-2xl self-start mt-1 transition"
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="lg:col-span-4 hidden lg:block">
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:sticky lg:top-24 shadow-sm border border-gray-100">
                        <h3 className="text-2xl font-semibold mb-6">Итого</h3>

                        <div className="flex justify-between text-3xl font-bold mb-8">
                            <span>{total.toLocaleString('ru-RU')} ₽</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/checkout')}
                            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-5 rounded-2xl text-xl font-semibold hover:from-pink-700 hover:to-rose-700 transition mb-4"
                        >
                            Оформить заказ
                        </button>

                        <button
                            type="button"
                            onClick={clearCart}
                            className="w-full text-gray-500 hover:text-red-600 py-3 transition"
                        >
                            Очистить корзину
                        </button>
                    </div>
                </div>
            </div>

            <MobileStickyBar>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Итого</p>
                    <p className="text-xl font-bold text-pink-600">{total.toLocaleString('ru-RU')} ₽</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/checkout')}
                    className="flex-1 max-w-[200px] bg-gradient-to-r from-pink-600 to-rose-600 text-white py-3.5 px-4 rounded-2xl font-semibold text-sm min-h-[48px]"
                >
                    Оформить
                </button>
            </MobileStickyBar>
        </div>
    );
}

export default Cart;
