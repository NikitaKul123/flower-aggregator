import axios from 'axios';
import { API_BASE } from '../config/api';

export async function fetchProductReviews(productId) {
    const res = await axios.get(`${API_BASE}/api/reviews/products/${productId}`);
    return res.data;
}

export async function submitOrderReview(token, orderId, { rating, text }) {
    const res = await axios.post(
        `${API_BASE}/api/reviews/orders/${orderId}`,
        { rating, text },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
}
