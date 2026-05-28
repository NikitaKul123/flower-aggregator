import axios from 'axios';
import { API_BASE } from '../config/api';

const API = `${API_BASE}/api/shop/reviews`;
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function fetchShopReviews(token) {
    const res = await axios.get(API, auth(token));
    return res.data;
}

export async function replyToReview(token, reviewId, text) {
    const res = await axios.put(`${API}/${reviewId}/reply`, { text }, auth(token));
    return res.data;
}
