import axios from 'axios';
import { API_BASE } from '../config/api';

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function fetchSubscribedShopIds(token) {
    const res = await axios.get(`${API_BASE}/api/shop-subscriptions`, auth(token));
    return res.data.shopIds || [];
}

export async function fetchShopSubscription(token, shopId) {
    const res = await axios.get(`${API_BASE}/api/shop-subscriptions/shop/${shopId}`, auth(token));
    return !!res.data.subscribed;
}

export async function subscribeToShop(token, shopId) {
    await axios.post(`${API_BASE}/api/shop-subscriptions/shop/${shopId}`, {}, auth(token));
}

export async function unsubscribeFromShop(token, shopId) {
    await axios.delete(`${API_BASE}/api/shop-subscriptions/shop/${shopId}`, auth(token));
}

export async function fetchFavoriteShops(token) {
    const res = await axios.get(`${API_BASE}/api/shop-favorites`, auth(token));
    return res.data;
}

export async function fetchFavoriteShopIds(token) {
    const res = await axios.get(`${API_BASE}/api/shop-favorites/ids`, auth(token));
    return res.data.shopIds || [];
}

export async function toggleShopFavoriteApi(token, shopId) {
    const res = await axios.post(`${API_BASE}/api/shop-favorites/toggle/${shopId}`, {}, auth(token));
    return !!res.data.favorite;
}
