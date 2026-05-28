import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchSuperAdminProducts, updateSuperAdminProduct } from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass, inputClass, btnPink } from '../utils/ui';
import { productImageUrl } from '../utils/productImage';

export default function SuperAdminProducts() {
    const { token } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await fetchSuperAdminProducts(token, { search: search || undefined });
            setProducts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token, search]);

    useEffect(() => {
        load();
    }, [load]);

    const setStatus = async (id, status) => {
        try {
            await updateSuperAdminProduct(token, id, { status });
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <SuperAdminLayout title="Все товары">
            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    className={`${inputClass()} max-w-sm`}
                    placeholder="Название, категория…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load()}
                />
                <button type="button" onClick={load} className={`${btnPink} px-4 py-2 text-sm`}>
                    Найти
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {products.map((p) => (
                        <div key={p.id} className={`${cardClass} p-4 flex gap-3`}>
                            <img
                                src={productImageUrl(p)}
                                alt=""
                                className="w-16 h-16 rounded-xl object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{p.name}</p>
                                <p className="text-xs text-gray-500">{p.shop?.name}</p>
                                <p className="text-pink-600 font-medium mt-1">
                                    {Number(p.price).toLocaleString('ru-RU')} ₽
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <select
                                        className="text-xs border rounded-lg px-2 py-1"
                                        value={p.status}
                                        onChange={(e) => setStatus(p.id, e.target.value)}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="HIDDEN">HIDDEN</option>
                                        <option value="DRAFT">DRAFT</option>
                                    </select>
                                    {p.isOutOfStock && (
                                        <span className="text-xs text-amber-700">Нет в наличии</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {products.length === 0 && (
                        <p className="text-center text-gray-500 py-8 col-span-full">Товары не найдены</p>
                    )}
                </div>
            )}
        </SuperAdminLayout>
    );
}
