import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../app.js';
import { setIo } from '../socket/io.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-ci';

function signShop(userId, shopId) {
    return jwt.sign({ userId, role: 'SHOP_ADMIN', shopId }, JWT_SECRET);
}

function signCustomer(userId) {
    return jwt.sign({ userId, role: 'CUSTOMER' }, JWT_SECRET);
}

describe('HTTP security', () => {
    let app;

    before(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        setIo({ to: () => ({ emit: () => {} }) });
        app = createApp();
    });

    it('rejects request without token', async () => {
        const res = await request(app).get('/api/customer/orders');
        assert.equal(res.status, 401);
        assert.ok(res.body.error);
        assert.equal(res.body.code, 'UNAUTHORIZED');
    });

    it('rejects shop admin on customer orders', async () => {
        const token = signShop(1, 1);
        const res = await request(app)
            .get('/api/customer/orders')
            .set('Authorization', `Bearer ${token}`);
        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'FORBIDDEN');
    });

    it('rejects customer on shop orders', async () => {
        const token = signCustomer(10);
        const res = await request(app)
            .get('/api/shop/orders')
            .set('Authorization', `Bearer ${token}`);
        assert.equal(res.status, 403);
    });

    it('returns 404 for unknown route with code', async () => {
        const res = await request(app).get('/api/unknown-route-xyz');
        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'NOT_FOUND');
    });

    it('notification settings route is not shadowed by :id/read', async () => {
        const token = signCustomer(10);
        const res = await request(app)
            .put('/api/notifications/settings')
            .set('Authorization', `Bearer ${token}`)
            .send({ soundEnabled: true });
        assert.notEqual(res.status, 404);
    });
});
