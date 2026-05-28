import axios from 'axios';
import { API_BASE } from '../config/api';

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function fetchStockSubscription(token, productId) {
    const res = await axios.get(
        `${API_BASE}/api/stock-alerts/product/${productId}`,
        auth(token)
    );
    return res.data;
}

export async function subscribeStockAlert(token, productId) {
    const res = await axios.post(
        `${API_BASE}/api/stock-alerts/product/${productId}`,
        {},
        auth(token)
    );
    return res.data;
}

export async function unsubscribeStockAlert(token, productId) {
    const res = await axios.delete(
        `${API_BASE}/api/stock-alerts/product/${productId}`,
        auth(token)
    );
    return res.data;
}
