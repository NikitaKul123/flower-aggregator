import axios from 'axios';
import { API_BASE } from '../config/api';

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function fetchVapidPublicKey() {
    const envKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    if (envKey) return envKey;
    const res = await axios.get(`${API_BASE}/api/push/vapid-public-key`);
    return res.data.publicKey;
}

export async function subscribePushOnServer(token, subscription) {
    await axios.post(`${API_BASE}/api/push/subscribe`, { subscription }, auth(token));
}

export async function unsubscribePushOnServer(token, endpoint) {
    await axios.delete(`${API_BASE}/api/push/subscribe`, {
        ...auth(token),
        data: { endpoint }
    });
}

export async function unsubscribeAllPushOnServer(token) {
    await axios.delete(`${API_BASE}/api/push/subscribe-all`, auth(token));
}
