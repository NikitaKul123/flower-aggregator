import axios from 'axios';

import { API_BASE } from '../config/api';

const API = `${API_BASE}/api/wishlist`;

export async function fetchWishlist(token) {
    const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
}

export async function toggleWishlistApi(productId, token) {
    const res = await axios.post(`${API}/toggle/${productId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.inWishlist;
}

export async function removeWishlistApi(productId, token) {
    await axios.delete(`${API}/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
}
