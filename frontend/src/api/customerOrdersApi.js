import axios from 'axios';

import { API_BASE } from '../config/api';

const API = `${API_BASE}/api/customer/orders`;
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

/** Пометить уведомления о смене статуса по заказу прочитанными */
export async function acknowledgeOrderStatus(token, orderId) {
    const res = await axios.put(`${API}/${orderId}/ack-status`, {}, auth(token));
    return res.data;
}

/** Товары для повторного заказа (актуальные цены и наличие) */
export async function fetchReorderItems(token, orderId) {
    const res = await axios.get(`${API}/${orderId}/reorder`, auth(token));
    return res.data;
}
