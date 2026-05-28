import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { corsOptions } from './config/cors.js';

import authRouter from './routes/auth.js';
import shopsRouter from './routes/shops.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import cartRouter from './routes/cart.js';
import shopAuthRouter from './routes/shopAuth.js';
import shopOrdersRouter from './routes/shopOrders.js';
import shopProductsRouter from './routes/shopProducts.js';
import messageRouter from './routes/messages.js';
import customerOrdersRoutes from './routes/customerOrders.js';
import notificationsRouter from './routes/notifications.js';
import wishlistRouter from './routes/wishlist.js';
import profileRouter from './routes/profile.js';
import shopAnalyticsRouter from './routes/shopAnalytics.js';
import shopPromosRouter from './routes/shopPromos.js';
import shopProfileRouter from './routes/shopProfile.js';
import courierAuthRouter from './routes/courierAuth.js';
import courierOrdersRouter from './routes/courierOrders.js';
import shopCouriersRouter from './routes/shopCouriers.js';
import reviewsRouter from './routes/reviews.js';
import stockAlertsRouter from './routes/stockAlerts.js';
import shopSubscriptionsRouter from './routes/shopSubscriptions.js';
import shopFavoritesRouter from './routes/shopFavorites.js';
import shopReviewsRouter from './routes/shopReviews.js';
import shopCrmRouter from './routes/shopCrm.js';
import superAdminAuthRouter from './routes/superAdminAuth.js';
import superAdminRouter from './routes/superAdmin.js';
import superAdminAnalyticsRouter from './routes/superAdminAnalytics.js';
import superAdminSettingsRouter from './routes/superAdminSettings.js';
import shopPlatformChatRouter from './routes/shopPlatformChat.js';
import superAdminPlatformChatRouter from './routes/superAdminPlatformChat.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
    const app = express();

    app.use(cors(corsOptions));

    app.use(express.json({ limit: '10mb' }));
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    app.get('/', (_, res) => res.send('работает'));

    app.use('/api/auth', authRouter);
    app.use('/api/shops', shopsRouter);
    app.use('/api/cart', cartRouter);
    app.use('/api/orders', ordersRouter);
    app.use('/api/shop-auth', shopAuthRouter);
    app.use('/api/products', productsRouter);
    app.use('/api/shop/orders', shopOrdersRouter);
    app.use('/api/shop/products', shopProductsRouter);
    app.use('/api/messages', messageRouter);
    app.use('/api/customer/orders', customerOrdersRoutes);
    app.use('/api/notifications', notificationsRouter);
    app.use('/api/wishlist', wishlistRouter);
    app.use('/api/profile', profileRouter);
    app.use('/api/shop/analytics', shopAnalyticsRouter);
    app.use('/api/shop/promos', shopPromosRouter);
    app.use('/api/shop/profile', shopProfileRouter);
    app.use('/api/courier-auth', courierAuthRouter);
    app.use('/api/courier/orders', courierOrdersRouter);
    app.use('/api/shop/couriers', shopCouriersRouter);
    app.use('/api/reviews', reviewsRouter);
    app.use('/api/stock-alerts', stockAlertsRouter);
    app.use('/api/shop-subscriptions', shopSubscriptionsRouter);
    app.use('/api/shop-favorites', shopFavoritesRouter);
    app.use('/api/shop/reviews', shopReviewsRouter);
    app.use('/api/shop/crm', shopCrmRouter);
    app.use('/api/shop/platform-chat', shopPlatformChatRouter);
    app.use('/api/super-admin-auth', superAdminAuthRouter);
    app.use('/api/super-admin', superAdminRouter);
    app.use('/api/super-admin/analytics', superAdminAnalyticsRouter);
    app.use('/api/super-admin/settings', superAdminSettingsRouter);
    app.use('/api/super-admin/platform-chats', superAdminPlatformChatRouter);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
