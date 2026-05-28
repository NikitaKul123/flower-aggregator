import axios from 'axios';

import { API_BASE } from '../config/api';

const API = `${API_BASE}/api/notifications`;

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function fetchNotifications(token) {
    const res = await axios.get(API, auth(token));
    return res.data;
}

/** @returns {{ count: number, ordersCount: number }} */
export async function fetchUnreadCounts(token) {
    const res = await axios.get(`${API}/count`, auth(token));
    return {
        count: Number(res.data.count) || 0,
        ordersCount: Number(res.data.ordersCount) || 0
    };
}

/** @deprecated use fetchUnreadCounts */
export async function fetchUnreadCount(token) {
    const { count } = await fetchUnreadCounts(token);
    return count;
}

export async function markNotificationRead(token, id) {
    await axios.put(`${API}/${id}/read`, {}, auth(token));
}

export async function markAllNotificationsRead(token) {
    await axios.put(`${API}/read-all`, {}, auth(token));
}

export async function fetchNotificationSettings(token) {
    const res = await axios.get(`${API}/settings`, auth(token));
    return res.data;
}

export async function saveNotificationSettings(token, data) {
    const res = await axios.put(`${API}/settings`, data, auth(token));
    return res.data;
}
