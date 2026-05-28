import axios from 'axios';

import { API_BASE } from '../config/api';

const API = `${API_BASE}/api/profile`;
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function fetchProfile(token) {
    const res = await axios.get(API, auth(token));
    return res.data;
}

export async function updateProfile(token, data) {
    const res = await axios.put(API, data, auth(token));
    return res.data;
}

export async function uploadAvatar(token, imageBase64) {
    const res = await axios.put(`${API}/avatar`, { imageBase64 }, auth(token));
    return res.data;
}

export async function addAddress(token, data) {
    const res = await axios.post(`${API}/addresses`, data, auth(token));
    return res.data;
}

export async function updateAddress(token, id, data) {
    const res = await axios.put(`${API}/addresses/${id}`, data, auth(token));
    return res.data;
}

export async function deleteAddress(token, id) {
    await axios.delete(`${API}/addresses/${id}`, auth(token));
}

export const ADDRESS_LABELS = {
    HOME: 'Дом',
    WORK: 'Работа',
    OTHER: 'Другое'
};
