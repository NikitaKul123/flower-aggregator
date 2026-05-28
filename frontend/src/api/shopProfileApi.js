import axios from 'axios';

import { API_BASE } from '../config/api';

const API = `${API_BASE}/api/shop/profile`;
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function fetchShopProfile(token) {
    const res = await axios.get(API, auth(token));
    return res.data;
}

export async function updateShopProfile(token, data) {
    const res = await axios.put(API, data, auth(token));
    return res.data;
}

export async function uploadShopAvatar(token, imageBase64) {
    const res = await axios.put(`${API}/avatar`, { imageBase64 }, auth(token));
    return res.data;
}
