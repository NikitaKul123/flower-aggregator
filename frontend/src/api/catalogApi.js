import axios from 'axios';
import { API_BASE } from '../config/api';

export async function fetchAllCatalogProducts() {
    const res = await axios.get(`${API_BASE}/api/products/catalog`);
    return res.data;
}

export async function fetchShops({ district, sameDay } = {}) {
    const params = new URLSearchParams();
    if (district?.trim()) params.set('district', district.trim());
    if (sameDay) params.set('sameDay', 'true');
    const qs = params.toString();
    const res = await axios.get(`${API_BASE}/api/shops${qs ? `?${qs}` : ''}`);
    return res.data;
}

export async function fetchShopById(shopId) {
    const res = await axios.get(`${API_BASE}/api/shops/${shopId}`);
    return res.data;
}
