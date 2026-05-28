import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../config/api';

function ShopDashboard() {

    const {
        user,
        token,
        loading: authLoading
    } = useContext(AuthContext);

    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        productsCount: 0
    });

    const [recentOrders, setRecentOrders] = useState([]);

    const [pageLoading, setPageLoading] =
        useState(true);


    useEffect(() => {

        if (authLoading) return;

        if (!user) {
            navigate('/shop/login');
            return;
        }

        if (user.role !== 'SHOP_ADMIN') {
            navigate('/');
            return;
        }

        loadDashboard();

    }, [
        user,
        token,
        authLoading
    ]);


    const loadDashboard =
        async () => {

            try {

                setPageLoading(true);

                const headers = {
                    Authorization:
                        `Bearer ${token}`
                };

                const [
                    ordersRes,
                    productsRes
                ] = await Promise.all([

                    axios.get(`${API_BASE}/api/shop/orders`, { headers }),

                    axios.get(`${API_BASE}/api/shop/products/my`, { headers })
                ]);

                const orders =
                    ordersRes.data;

                const products =
                    productsRes.data;

                setStats({

                    totalOrders:
                    orders.length,

                    pendingOrders:
                    orders.filter(
                        o =>
                            o.status ===
                            'PENDING'
                    ).length,

                    totalRevenue:
                        orders
                            .filter(
                                o =>
                                    o.status !==
                                    'CANCELLED'
                            )
                            .reduce(
                                (
                                    sum,
                                    order
                                ) =>
                                    sum +
                                    order.total,
                                0
                            ),

                    productsCount:
                    products.length
                });

                setRecentOrders(
                    orders
                        .slice(0, 5)
                        .map(
                            (
                                order
                            ) => ({

                                id:
                                order.id,

                                customer:
                                    order
                                        .deliveryInfo
                                        ?.name ||

                                    order
                                        .user
                                        ?.name ||

                                    'Клиент',

                                amount:
                                order.total,

                                status:
                                order.status,

                                date:
                                    new Date(
                                        order.createdAt
                                    )
                                        .toLocaleDateString(
                                            'ru-RU'
                                        )
                            })
                        )
                );

            } catch (error) {

                console.error(error);

            } finally {

                setPageLoading(false);
            }
        };


    if (
        authLoading ||
        pageLoading
    ) {
        return (
            <div className="text-center py-20 text-xl">
                Загрузка панели...
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 sm:mb-10">

                <div>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                        Панель управления
                    </h1>

                    <p className="text-gray-600 mt-1">
                        Добро пожаловать,
                        <span className="font-semibold text-pink-600">
                            {' '}
                            {user?.name}
                        </span>
                    </p>

                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/shop/platform-chat"
                        className="bg-white border border-pink-200 text-pink-700 px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl text-center text-sm sm:text-base hover:bg-pink-50 transition"
                    >
                        💬 Поддержка платформы
                    </Link>
                    <Link
                        to="/shop/products"
                        className="bg-pink-600 text-white px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl text-center text-sm sm:text-base hover:bg-pink-700 transition"
                    >
                        + Добавить товар
                    </Link>
                </div>

            </div>


            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">

                <Stat
                    title="Всего заказов"
                    value={stats.totalOrders}
                />

                <Stat
                    title="В обработке"
                    value={stats.pendingOrders}
                />

                <Stat
                    title="Выручка"
                    value={`${stats.totalRevenue.toLocaleString('ru-RU')} ₽`}
                />

                <Stat
                    title="Товаров"
                    value={stats.productsCount}
                />

            </div>


            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-gray-100 shadow-sm">

                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-6">

                    <h2 className="text-2xl font-semibold">
                        Последние заказы
                    </h2>

                    <Link
                        to="/shop/orders"
                        className="text-pink-600"
                    >
                        Все →
                    </Link>

                </div>

                {
                    recentOrders.length === 0
                        ? (
                            <div>
                                Пока нет заказов
                            </div>
                        )
                        : (
                            recentOrders.map(
                                order => (

                                    <div
                                        key={order.id}
                                        className="flex flex-col sm:flex-row sm:justify-between gap-2 py-4 sm:py-5 border-b border-gray-100"
                                    >

                                        <div>

                                            <div className="font-medium">
                                                {
                                                    order.customer
                                                }
                                            </div>

                                            <div className="text-sm text-gray-500">
                                                Заказ №
                                                {
                                                    order.id
                                                }
                                            </div>

                                        </div>

                                        <div>

                                            <div>
                                                {
                                                    order.amount
                                                } ₽
                                            </div>

                                            <span
                                                className={`px-3 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}
                                            >
                                                {
                                                    order.status
                                                }
                                            </span>

                                        </div>

                                        <div>
                                            {
                                                order.date
                                            }
                                        </div>

                                    </div>
                                )
                            )
                        )
                }

            </div>

            {/* Быстрые действия */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">

                <Link
                    to="/shop/products"
                    className="bg-white p-10 rounded-3xl shadow-sm hover:shadow-md transition text-center"
                >
                    <div className="text-6xl mb-4">
                        📦
                    </div>

                    <h3 className="font-semibold text-2xl">
                        Мои товары
                    </h3>

                    <p className="text-gray-500 mt-3">
                        Управление ассортиментом
                    </p>
                </Link>


                <Link
                    to="/shop/orders"
                    className="bg-white p-10 rounded-3xl shadow-sm hover:shadow-md transition text-center"
                >
                    <div className="text-6xl mb-4">
                        📋
                    </div>

                    <h3 className="font-semibold text-2xl">
                        Заказы
                    </h3>

                    <p className="text-gray-500 mt-3">
                        Обработка и статусы
                    </p>
                </Link>


                <Link to="/shop/analytics" className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition text-center border border-gray-100">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="font-semibold text-2xl">Аналитика</h3>
                    <p className="text-gray-500 mt-3">Графики и конверсия</p>
                </Link>

                <Link to="/shop/promos" className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition text-center border border-gray-100">
                    <div className="text-6xl mb-4">🏷️</div>
                    <h3 className="font-semibold text-2xl">Промокоды</h3>
                    <p className="text-gray-500 mt-3">Скидки и акции</p>
                </Link>

                <Link to="/shop/reviews" className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition text-center border border-gray-100">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="font-semibold text-2xl">Отзывы</h3>
                    <p className="text-gray-500 mt-3">Ответы покупателям</p>
                </Link>

                <Link to="/shop/crm" className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition text-center border border-gray-100">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="font-semibold text-2xl">Клиенты</h3>
                    <p className="text-gray-500 mt-3">Теги и заметки</p>
                </Link>

                <Link to="/shop/notifications" className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition text-center border border-gray-100">
                    <div className="text-6xl mb-4">🛎️</div>
                    <h3 className="font-semibold text-2xl">Уведомления</h3>
                    <p className="text-gray-500 mt-3">Заказы и чаты</p>
                </Link>

            </div>

        </div>
    );
}


function Stat({
                  title,
                  value
              }) {
    return (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-gray-100 shadow-sm">

            <div className="text-gray-500 text-xs sm:text-sm">
                {title}
            </div>

            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mt-1 sm:mt-2 break-words">
                {value}
            </div>

        </div>
    );
}


function getStatusColor(
    status
) {

    switch (status) {

        case 'PENDING':
            return 'bg-yellow-100 text-yellow-700';

        case 'CONFIRMED':
            return 'bg-blue-100 text-blue-700';

        case 'ASSEMBLING':
            return 'bg-purple-100 text-purple-700';

        case 'READY':
            return 'bg-green-100 text-green-700';

        case 'DELIVERING':
            return 'bg-orange-100 text-orange-700';

        case 'DELIVERED':
            return 'bg-emerald-100 text-emerald-700';

        case 'NO_CONTACT':
            return 'bg-amber-100 text-amber-800';

        default:
            return 'bg-gray-100';
    }
}

export default ShopDashboard;