import { useLocation, Link } from 'react-router-dom';

function OrderSuccess() {
    const { state } = useLocation();
    const orderId = state?.orderId;

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="max-w-md text-center">
                <div className="text-8xl mb-6">🎉</div>
                <h1 className="text-5xl font-bold text-green-600 mb-4">Заказ оформлен!</h1>

                {orderId && (
                    <p className="text-2xl text-gray-700 mb-8">
                        Номер заказа: <strong>#{orderId}</strong>
                    </p>
                )}

                <p className="text-gray-600 mb-10 text-lg">
                    Спасибо! Мы уже уведомили магазин.
                    Вы можете отслеживать статус в личном кабинете.
                </p>

                <div className="flex flex-col gap-4">
                    <Link
                        to="/"
                        className="bg-pink-600 text-white py-4 rounded-2xl text-lg font-semibold hover:bg-pink-700"
                    >
                        Вернуться на главную
                    </Link>
                    <Link
                        to="/orders"  // позже сделаем страницу моих заказов
                        className="border border-pink-600 text-pink-600 py-4 rounded-2xl text-lg font-semibold hover:bg-pink-50"
                    >
                        Мои заказы
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default OrderSuccess;