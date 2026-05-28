import axios from 'axios';
import { API_BASE } from '../config/api';

const AUTH = `${API_BASE}/api/super-admin-auth`;
const API = `${API_BASE}/api/super-admin`;
const ANALYTICS = `${API_BASE}/api/super-admin/analytics`;
const SETTINGS = `${API_BASE}/api/super-admin/settings`;

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function superAdminLogin(email, password) {
    const res = await axios.post(`${AUTH}/login`, { email, password });
    return res.data;
}

export async function fetchSuperAdminDashboard(token) {
    const res = await axios.get(`${API}/dashboard`, auth(token));
    return res.data;
}

export async function fetchSuperAdminUsers(token, params = {}) {
    const res = await axios.get(`${API}/users`, { ...auth(token), params });
    return res.data;
}

export async function updateSuperAdminUser(token, userId, data) {
    const res = await axios.patch(`${API}/users/${userId}`, data, auth(token));
    return res.data;
}

export async function deleteSuperAdminUser(token, userId) {
    const res = await axios.delete(`${API}/users/${userId}`, auth(token));
    return res.data;
}

export async function fetchSuperAdminShops(token, params = {}) {
    const res = await axios.get(`${API}/shops`, { ...auth(token), params });
    return res.data;
}

export async function updateSuperAdminShop(token, shopId, data) {
    const res = await axios.patch(`${API}/shops/${shopId}`, data, auth(token));
    return res.data;
}

export async function deleteSuperAdminShop(token, shopId) {
    const res = await axios.delete(`${API}/shops/${shopId}`, auth(token));
    return res.data;
}

export async function fetchSuperAdminOrders(token, params = {}) {
    const res = await axios.get(`${API}/orders`, { ...auth(token), params });
    return res.data;
}

export async function updateSuperAdminOrderStatus(token, orderId, status, comment) {
    const res = await axios.put(`${API}/orders/${orderId}/status`, { status, comment }, auth(token));
    return res.data;
}

export async function fetchSuperAdminProducts(token, params = {}) {
    const res = await axios.get(`${API}/products`, { ...auth(token), params });
    return res.data;
}

export async function updateSuperAdminProduct(token, productId, data) {
    const res = await axios.patch(`${API}/products/${productId}`, data, auth(token));
    return res.data;
}

export async function fetchSuperAdminOrder(token, orderId) {
    const res = await axios.get(`${API}/orders/${orderId}`, auth(token));
    return res.data;
}

export async function fetchSuperAdminOrderMessages(token, orderId, channel = 'SHOP') {
    const res = await axios.get(`${API}/orders/${orderId}/messages`, {
        ...auth(token),
        params: { channel }
    });
    return res.data;
}

export async function fetchSuperAdminReviews(token, params = {}) {
    const res = await axios.get(`${API}/reviews`, { ...auth(token), params });
    return res.data;
}

export async function deleteSuperAdminReview(token, reviewId) {
    const res = await axios.delete(`${API}/reviews/${reviewId}`, auth(token));
    return res.data;
}

export async function deleteSuperAdminReviewReply(token, reviewId) {
    const res = await axios.delete(`${API}/reviews/${reviewId}/reply`, auth(token));
    return res.data;
}

export async function fetchSuperAdminCouriers(token, params = {}) {
    const res = await axios.get(`${API}/couriers`, { ...auth(token), params });
    return res.data;
}

export async function updateSuperAdminCourier(token, userId, isActive) {
    const res = await axios.patch(`${API}/couriers/${userId}`, { isActive }, auth(token));
    return res.data;
}

export async function fetchSuperAdminPromos(token, params = {}) {
    const res = await axios.get(`${API}/promos`, { ...auth(token), params });
    return res.data;
}

export async function updateSuperAdminPromo(token, promoId, isActive) {
    const res = await axios.patch(`${API}/promos/${promoId}`, { isActive }, auth(token));
    return res.data;
}

export async function fetchSuperAdminAuditLog(token, limit = 100) {
    const res = await axios.get(`${API}/audit-log`, { ...auth(token), params: { limit } });
    return res.data;
}

export async function fetchSuperAdminAnalytics(token, params = {}) {
    const res = await axios.get(ANALYTICS, { ...auth(token), params });
    return res.data;
}

export async function downloadSuperAdminAnalyticsCsv(token, params = {}) {
    const res = await axios.get(`${ANALYTICS}/export`, {
        ...auth(token),
        params,
        responseType: 'blob'
    });
    return res.data;
}

export async function fetchSuperAdminChats(token, params = {}) {
    const res = await axios.get(`${API}/chats`, { ...auth(token), params });
    return res.data;
}

export async function resetSuperAdminUserPassword(token, userId, data = {}) {
    const res = await axios.post(`${API}/users/${userId}/reset-password`, data, auth(token));
    return res.data;
}

export async function fetchSuperAdminOwnerProfile(token) {
    const res = await axios.get(`${SETTINGS}/profile`, auth(token));
    return res.data;
}

export async function changeSuperAdminPassword(token, currentPassword, newPassword) {
    const res = await axios.patch(
        `${SETTINGS}/password`,
        { currentPassword, newPassword },
        auth(token)
    );
    return res.data;
}

export async function fetchSuperAdminTeam(token) {
    const res = await axios.get(`${SETTINGS}/team`, auth(token));
    return res.data;
}

export async function createSuperAdminTeamMember(token, data) {
    const res = await axios.post(`${SETTINGS}/team`, data, auth(token));
    return res.data;
}

export async function fetchSuperAdminPlatformChats(token, params = {}) {
    const res = await axios.get(`${API}/platform-chats`, { ...auth(token), params });
    return res.data;
}

export async function fetchSuperAdminPlatformChat(token, shopId) {
    const res = await axios.get(`${API}/platform-chats/${shopId}`, auth(token));
    return res.data;
}

export async function sendSuperAdminPlatformMessage(token, shopId, text) {
    const res = await axios.post(`${API}/platform-chats/${shopId}`, { text }, auth(token));
    return res.data;
}
