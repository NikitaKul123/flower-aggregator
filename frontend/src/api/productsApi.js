import axios from 'axios';
import { API_BASE } from '../config/api';

export async function fetchPriceCompare(productId) {
    const res = await axios.get(`${API_BASE}/api/products/${productId}/price-compare`);
    return res.data;
}
