import { Routes, Route } from 'react-router-dom';
import ShopList from '../pages/ShopList';
import Catalog from '../pages/Catalog';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import Wishlist from '../pages/Wishlist';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ShopRegister from '../pages/ShopRegister';
import ShopLogin from '../pages/ShopLogin';
import ShopDashboard from '../pages/ShopDashboard';
import ShopProducts from '../pages/ShopProducts';
import ShopOrders from '../pages/ShopOrders';
import OrderSuccess from '../pages/OrderSuccess';
import ShopChat from '../pages/ShopChat';
import CustomerChat from '../pages/CustomerChat';
import CustomerOrders from '../pages/CustomerOrders';
import Notifications from '../pages/Notifications';
import ShopNotifications from '../pages/ShopNotifications';
import NotificationSettings from '../pages/NotificationSettings';
import Profile from '../pages/Profile';
import ShopAnalytics from '../pages/ShopAnalytics';
import ShopPromos from '../pages/ShopPromos';
import ShopProfile from '../pages/ShopProfile';
import ShopReviews from '../pages/ShopReviews';
import ShopCrm from '../pages/ShopCrm';
import CourierLogin from '../pages/CourierLogin';
import CourierOrders from '../pages/CourierOrders';
import CourierChat from '../pages/CourierChat';
import CourierNotifications from '../pages/CourierNotifications';
import ShopCouriers from '../pages/ShopCouriers';
import CourierAuthGate from './CourierAuthGate';
import SuperAdminAuthGate from './SuperAdminAuthGate';
import SuperAdminLogin from '../pages/SuperAdminLogin';
import SuperAdminDashboard from '../pages/SuperAdminDashboard';
import SuperAdminUsers from '../pages/SuperAdminUsers';
import SuperAdminShops from '../pages/SuperAdminShops';
import SuperAdminOrders from '../pages/SuperAdminOrders';
import SuperAdminProducts from '../pages/SuperAdminProducts';
import SuperAdminOrderDetail from '../pages/SuperAdminOrderDetail';
import SuperAdminReviews from '../pages/SuperAdminReviews';
import SuperAdminCouriers from '../pages/SuperAdminCouriers';
import SuperAdminPromos from '../pages/SuperAdminPromos';
import SuperAdminAudit from '../pages/SuperAdminAudit';
import SuperAdminAnalytics from '../pages/SuperAdminAnalytics';
import SuperAdminChats from '../pages/SuperAdminChats';
import SuperAdminShopChats from '../pages/SuperAdminShopChats';
import SuperAdminShopChat from '../pages/SuperAdminShopChat';
import SuperAdminSettings from '../pages/SuperAdminSettings';
import ShopPlatformChat from '../pages/ShopPlatformChat';

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<ShopList />} />
            <Route path="/catalog/:shopId" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/shop/login" element={<ShopLogin />} />
            <Route path="/shop/register" element={<ShopRegister />} />
            <Route path="/shop/dashboard" element={<ShopDashboard />} />
            <Route path="/shop/products" element={<ShopProducts />} />
            <Route path="/shop/analytics" element={<ShopAnalytics />} />
            <Route path="/shop/promos" element={<ShopPromos />} />
            <Route path="/shop/profile" element={<ShopProfile />} />
            <Route path="/shop/reviews" element={<ShopReviews />} />
            <Route path="/shop/crm" element={<ShopCrm />} />
            <Route path="/shop/orders" element={<ShopOrders />} />
            <Route path="/success" element={<OrderSuccess />} />
            <Route path="/shop/orders/:orderId/chat" element={<ShopChat />} />
            <Route path="/orders" element={<CustomerOrders />} />
            <Route path="/orders/:orderId/chat" element={<CustomerChat />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings/notifications" element={<NotificationSettings />} />
            <Route path="/shop/notifications" element={<ShopNotifications />} />
            <Route path="/shop/settings/notifications" element={<NotificationSettings />} />
            <Route path="/shop/couriers" element={<ShopCouriers />} />
            <Route path="/shop/platform-chat" element={<ShopPlatformChat />} />
            <Route path="/courier/login" element={<CourierLogin />} />
            <Route path="/courier/orders" element={<CourierAuthGate><CourierOrders /></CourierAuthGate>} />
            <Route path="/courier/notifications" element={<CourierAuthGate><CourierNotifications /></CourierAuthGate>} />
            <Route path="/courier/orders/:orderId/chat" element={<CourierAuthGate><CourierChat /></CourierAuthGate>} />
            <Route path="/super-admin/login" element={<SuperAdminLogin />} />
            <Route path="/super-admin" element={<SuperAdminAuthGate><SuperAdminDashboard /></SuperAdminAuthGate>} />
            <Route path="/super-admin/analytics" element={<SuperAdminAuthGate><SuperAdminAnalytics /></SuperAdminAuthGate>} />
            <Route path="/super-admin/chats" element={<SuperAdminAuthGate><SuperAdminChats /></SuperAdminAuthGate>} />
            <Route path="/super-admin/shop-chats" element={<SuperAdminAuthGate><SuperAdminShopChats /></SuperAdminAuthGate>} />
            <Route path="/super-admin/shop-chats/:shopId" element={<SuperAdminAuthGate><SuperAdminShopChat /></SuperAdminAuthGate>} />
            <Route path="/super-admin/settings" element={<SuperAdminAuthGate><SuperAdminSettings /></SuperAdminAuthGate>} />
            <Route path="/super-admin/users" element={<SuperAdminAuthGate><SuperAdminUsers /></SuperAdminAuthGate>} />
            <Route path="/super-admin/shops" element={<SuperAdminAuthGate><SuperAdminShops /></SuperAdminAuthGate>} />
            <Route path="/super-admin/orders" element={<SuperAdminAuthGate><SuperAdminOrders /></SuperAdminAuthGate>} />
            <Route path="/super-admin/products" element={<SuperAdminAuthGate><SuperAdminProducts /></SuperAdminAuthGate>} />
            <Route path="/super-admin/orders/:orderId" element={<SuperAdminAuthGate><SuperAdminOrderDetail /></SuperAdminAuthGate>} />
            <Route path="/super-admin/reviews" element={<SuperAdminAuthGate><SuperAdminReviews /></SuperAdminAuthGate>} />
            <Route path="/super-admin/couriers" element={<SuperAdminAuthGate><SuperAdminCouriers /></SuperAdminAuthGate>} />
            <Route path="/super-admin/promos" element={<SuperAdminAuthGate><SuperAdminPromos /></SuperAdminAuthGate>} />
            <Route path="/super-admin/audit" element={<SuperAdminAuthGate><SuperAdminAudit /></SuperAdminAuthGate>} />
        </Routes>
    );
}
