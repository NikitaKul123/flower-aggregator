import axios from 'axios';
import { API_BASE } from '../config/api';

const API = `${API_BASE}/api/shop/platform-chat`;

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function fetchShopPlatformChat(token) {
    const res = await axios.get(API, auth(token));
    return res.data;
}

export async function sendShopPlatformMessage(token, text) {
    const res = await axios.post(API, { text }, auth(token));
    return res.data;
}
