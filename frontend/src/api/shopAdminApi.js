import axios from 'axios';
import { API_BASE } from '../config/api';

const API = `${API_BASE}/api`;
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function fetchShopAnalytics(token, period = 'day') {
    const res = await axios.get(`${API}/shop/analytics?period=${period}`, auth(token));
    return res.data;
}

export async function fetchPromos(token) {
    const res = await axios.get(`${API}/shop/promos`, auth(token));
    return res.data;
}

export async function createPromo(token, data) {
    const res = await axios.post(`${API}/shop/promos`, data, auth(token));
    return res.data;
}

export async function updatePromo(token, id, data) {
    const res = await axios.put(`${API}/shop/promos/${id}`, data, auth(token));
    return res.data;
}

export async function deletePromo(token, id) {
    await axios.delete(`${API}/shop/promos/${id}`, auth(token));
}

export async function validatePromoCode(token, code, shopId, subtotal) {
    const res = await axios.post(`${API}/shop/promos/validate`, { code, shopId, subtotal }, auth(token));
    return res.data;
}

export async function quickProductAction(token, productId, action) {
    const res = await axios.patch(
        `${API}/shop/products/${productId}/quick`,
        { action },
        auth(token)
    );
    return res.data;
}

export const PRODUCT_STATUS = {
    DRAFT: { label: 'Черновик', color: 'bg-gray-100 text-gray-700' },
    ACTIVE: { label: 'В продаже', color: 'bg-green-100 text-green-700' },
    HIDDEN: { label: 'Скрыт', color: 'bg-yellow-100 text-yellow-700' }
};

export async function bulkProductAction(token, productIds, action) {
    const res = await axios.post(
        `${API}/shop/products/bulk`,
        { productIds, action },
        auth(token)
    );
    return res.data;
}

export async function duplicateProduct(token, productId, options = {}) {
    const res = await axios.post(
        `${API}/shop/products/${productId}/duplicate`,
        options,
        auth(token)
    );
    return res.data;
}

export async function fetchProductTemplates(token) {
    const res = await axios.get(`${API}/shop/products/my?templates=true`, auth(token));
    return res.data;
}

export async function saveOrderNotes(token, orderId, shopNotes) {
    const res = await axios.put(
        `${API}/shop/orders/${orderId}/notes`,
        { shopNotes },
        auth(token)
    );
    return res.data;
}

export async function fetchShopCustomers(token) {
    const res = await axios.get(`${API}/shop/crm/customers`, auth(token));
    return res.data;
}

export async function updateShopCustomer(token, userId, data) {
    const res = await axios.put(`${API}/shop/crm/customers/${userId}`, data, auth(token));
    return res.data;
}
