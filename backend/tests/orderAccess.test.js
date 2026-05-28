import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessOrder } from '../utils/orderAccess.js';

describe('canAccessOrder', () => {
    const order = { id: 1, userId: 10, shopId: 20 };

    it('allows customer to own order', () => {
        assert.equal(canAccessOrder(order, { role: 'CUSTOMER', userId: 10 }), true);
    });

    it('denies customer other orders', () => {
        assert.equal(canAccessOrder(order, { role: 'CUSTOMER', userId: 99 }), false);
    });

    it('courier sees only assigned orders', () => {
        const order = { userId: 10, shopId: 20, courierId: 5 };
        assert.equal(canAccessOrder(order, { role: 'COURIER', userId: 5, shopId: 20 }), true);
        assert.equal(canAccessOrder(order, { role: 'COURIER', userId: 6, shopId: 20 }), false);
    });

    it('allows shop admin for own shop', () => {
        assert.equal(
            canAccessOrder(order, { role: 'SHOP_ADMIN', userId: 5, shopId: 20 }, 20),
            true
        );
    });

    it('denies shop admin for other shop', () => {
        assert.equal(
            canAccessOrder(order, { role: 'SHOP_ADMIN', userId: 5, shopId: 99 }, 99),
            false
        );
    });

    it('denies shop admin without shopId', () => {
        assert.equal(canAccessOrder(order, { role: 'SHOP_ADMIN', userId: 5 }), false);
    });
});
