import axios from 'axios';
import { API_BASE } from '../config/api';

const AUTH = `${API_BASE}/api/courier-auth`;
const ORDERS = `${API_BASE}/api/courier/orders`;
const SHOP_COURIERS = `${API_BASE}/api/shop/couriers`;

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function courierLogin(email, password) {
    const res = await axios.post(`${AUTH}/login`, { email, password });
    return res.data;
}

/** @param {'active'|'completed'|'all'} scope */
export async function fetchCourierOrders(token, scope = 'active') {
    const segment = scope === 'completed' ? 'completed' : scope === 'all' ? 'all' : 'active';
    const res = await axios.get(`${ORDERS}/${segment}`, auth(token));
    return res.data;
}

export async function fetchCourierMapRoute(token) {
    const res = await axios.get(`${ORDERS}/map-route`, auth(token));
    return res.data;
}

export async function fetchCourierShop(token) {
    const res = await axios.get(`${ORDERS}/shop`, auth(token));
    return res.data;
}

export async function courierPickup(token, orderId) {
    const res = await axios.put(`${ORDERS}/${orderId}/pickup`, {}, auth(token));
    return res.data;
}

export async function courierNoContact(token, orderId, comment) {
    const res = await axios.put(`${ORDERS}/${orderId}/no-contact`, { comment }, auth(token));
    return res.data;
}

export async function courierDeliver(token, orderId, payload) {
    const res = await axios.put(`${ORDERS}/${orderId}/deliver`, payload, auth(token));
    return res.data;
}

export async function fetchShopCouriers(token) {
    const res = await axios.get(SHOP_COURIERS, auth(token));
    return res.data;
}

export async function createShopCourier(token, data) {
    const res = await axios.post(SHOP_COURIERS, data, auth(token));
    return res.data;
}

export async function setCourierActive(token, userId, isActive) {
    const res = await axios.patch(`${SHOP_COURIERS}/${userId}`, { isActive }, auth(token));
    return res.data;
}

export async function assignOrderCourier(token, orderId, courierId) {
    const res = await axios.put(
        `${API_BASE}/api/shop/orders/${orderId}/courier`,
        { courierId: courierId ?? null },
        auth(token)
    );
    return res.data;
}
