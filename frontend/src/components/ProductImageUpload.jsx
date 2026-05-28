import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { mediaUrl } from '../utils/media';

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function ProductImageUpload({ token, images, onChange }) {
    const [uploading, setUploading] = useState(false);
    const list = images.length ? images : [''];

    const setAt = (idx, value) => {
        const next = [...list];
        next[idx] = value;
        onChange(next.filter((u, i) => u.trim() || i < next.length - 1 || next.length === 1));
    };

    const uploadFile = async file => {
        if (!file.type.startsWith('image/')) {
            alert('Выберите изображение');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Файл не больше 5 МБ');
            return;
        }
        setUploading(true);
        try {
            const imageBase64 = await readFileAsDataUrl(file);
            const res = await axios.post(
                `${API_BASE}/api/shop/products/upload-image`,
                { imageBase64 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const filled = list.filter(u => u.trim());
            onChange([...filled, res.data.url]);
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка загрузки');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="col-span-2 space-y-3">
            <label className="flex flex-col items-center justify-center w-full min-h-[100px] border-2 border-dashed border-pink-200 rounded-2xl bg-pink-50/40 cursor-pointer hover:bg-pink-50">
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading || !token}
                    onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) uploadFile(file);
                        e.target.value = '';
                    }}
                />
                <span className="text-sm text-pink-700 font-medium py-6">
                    {uploading ? 'Загрузка…' : '📷 Загрузить фото с компьютера'}
                </span>
            </label>

            <p className="text-xs text-gray-500">или ссылка на изображение:</p>
            {list.map((url, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                    {url.trim() && (
                        <img
                            src={mediaUrl(url)}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border shrink-0"
                        />
                    )}
                    <input
                        type="text"
                        placeholder={`URL ${idx + 1}`}
                        value={url.startsWith('/uploads') ? url : url}
                        onChange={e => setAt(idx, e.target.value)}
                        className="flex-1 border rounded-xl px-4 py-3 text-sm"
                        required={idx === 0 && !list.some(u => u.trim())}
                    />
                    {list.length > 1 && (
                        <button
                            type="button"
                            onClick={() => onChange(list.filter((_, i) => i !== idx))}
                            className="px-3 border rounded-xl text-gray-500"
                        >
                            ✕
                        </button>
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={() => onChange([...list.filter(u => u.trim()), ''])}
                className="text-sm text-pink-600 font-medium"
            >
                + Ещё фото (URL)
            </button>
        </div>
    );
}
