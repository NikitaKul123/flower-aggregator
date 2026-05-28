import axios from 'axios';

import { API_BASE } from '../config/api';

const API = `${API_BASE}/api`;

export async function fetchPublicPromos(shopId) {
    const id = Number(shopId);
    if (!id || Number.isNaN(id)) return [];

    const urls = [
        `${API}/shops/${id}/promos`,
        `${API}/shop/promos/public/${id}`
    ];

    for (const url of urls) {
        try {
            const res = await axios.get(url);
            return Array.isArray(res.data) ? res.data : [];
        } catch (err) {
            if (err.response?.status !== 404) throw err;
        }
    }
    return [];
}
