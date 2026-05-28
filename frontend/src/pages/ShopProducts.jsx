import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ShopAuthGate from '../components/ShopAuthGate';
import {
    quickProductAction,
    PRODUCT_STATUS,
    bulkProductAction,
    duplicateProduct,
    fetchProductTemplates
} from '../api/shopAdminApi';
import ProductImageUpload from '../components/ProductImageUpload';
import { productImageUrl } from '../utils/productImage';
import { API_BASE } from '../config/api';

function ShopProductsContent() {
    const { token, loading: authLoading } = useContext(AuthContext);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [tab, setTab] = useState('catalog');
    const [templates, setTemplates] = useState([]);
    const [selected, setSelected] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    const [editingProduct, setEditingProduct] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        category: '',
        image: '',
        images: [''],
        status: 'DRAFT',
        stock: '',
        isOutOfStock: false
    });

    const authHeaders = useCallback(
        () => ({ headers: { Authorization: `Bearer ${token}` } }),
        [token]
    );

    const fetchMyProducts = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(
                `${API_BASE}/api/shop/products/my`,
                authHeaders()
            );
            setProducts(res.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Не удалось загрузить товары');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [token, authHeaders]);

    useEffect(() => {
        if (authLoading) return;
        if (!token) {
            setLoading(false);
            return;
        }
        fetchMyProducts();
        if (token) {
            fetchProductTemplates(token).then(setTemplates).catch(() => setTemplates([]));
        }
    }, [authLoading, token, fetchMyProducts]);

    const reloadAll = () => {
        fetchMyProducts();
        if (token) fetchProductTemplates(token).then(setTemplates).catch(() => {});
    };

    const toggleSelect = id => {
        setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    };

    const runBulk = async action => {
        if (!selected.length) return alert('Выберите товары');
        setBulkLoading(true);
        try {
            await bulkProductAction(token, selected, action);
            setSelected([]);
            reloadAll();
        } catch {
            alert('Ошибка');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleDuplicate = async (id, opts) => {
        try {
            await duplicateProduct(token, id, opts);
            alert(opts.asTemplate ? 'Шаблон сохранён' : 'Копия создана');
            reloadAll();
        } catch {
            alert('Ошибка');
        }
    };

    // ================= SUBMIT =================

    const buildPayload = () => {
        const imageList = formData.images.map(s => s.trim()).filter(Boolean);
        return {
            ...formData,
            price: Number(formData.price),
            stock: formData.stock === '' ? null : Number(formData.stock),
            image: imageList[0] || '',
            images: imageList
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = buildPayload();
        if (!payload.images.length) {
            alert('Добавьте хотя бы одно фото');
            return;
        }

        try {

            if (editingProduct) {

                await axios.put(
                    `${API_BASE}/api/shop/products/${editingProduct.id}`,
                    payload,
                    authHeaders()
                );

                alert('Товар обновлён');

            } else {

                await axios.post(
                    `${API_BASE}/api/shop/products`,
                    payload,
                    authHeaders()
                );

                alert('Товар добавлен');
            }

            setShowForm(false);

            setEditingProduct(null);

            setFormData({
                name: '',
                price: '',
                description: '',
                category: '',
                image: '',
                images: [''],
                status: 'DRAFT',
                stock: '',
                isOutOfStock: false
            });

            reloadAll();

        } catch (error) {

            console.error(error);

            alert('Ошибка сохранения товара');
        }
    };

    // ================= EDIT =================

    const handleEdit = (product) => {

        setEditingProduct(product);

        const imgs = product.images?.length
            ? [...product.images]
            : product.image
                ? [product.image]
                : [''];

        setFormData({
            name: product.name,
            price: product.price,
            description: product.description || '',
            category: product.category,
            image: product.image,
            images: imgs,
            status: product.status || 'DRAFT',
            stock: product.stock ?? '',
            isOutOfStock: !!product.isOutOfStock
        });

        setShowForm(true);
    };

    const handleQuick = async (id, action) => {
        try {
            await quickProductAction(token, id, action);
            reloadAll();
        } catch {
            alert('Ошибка');
        }
    };

    const handleDelete = async (id) => {

        if (
            !window.confirm(
                'Удалить товар?'
            )
        ) {
            return;
        }

        try {

            await axios.delete(
                `${API_BASE}/api/shop/products/${id}`,
                authHeaders()
            );

            alert(
                'Товар удалён'
            );

            await fetchMyProducts();

        } catch (error) {

            console.error(
                error
            );

            alert(
                'Ошибка удаления'
            );
        }
    };

    if (authLoading || loading) {
        return <div className="p-10 text-center text-gray-500">Загрузка…</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <div>
                    <Link to="/shop/dashboard" className="text-sm text-pink-600 hover:underline mb-2 inline-block">
                        ← Дашборд
                    </Link>
                    <h1 className="text-4xl font-bold">Мои товары</h1>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setShowForm(true);
                            setEditingProduct(null);
                        }}
                        className="bg-pink-600 text-white px-6 py-3 rounded-2xl"
                    >
                        + Товар
                    </button>
                    <Link to="/shop/crm" className="border border-pink-200 text-pink-700 px-5 py-3 rounded-2xl text-sm font-medium">
                        👥 CRM
                    </Link>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                <button
                    type="button"
                    onClick={() => setTab('catalog')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'catalog' ? 'bg-pink-600 text-white' : 'bg-white border'}`}
                >
                    Витрина ({products.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('templates')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'templates' ? 'bg-pink-600 text-white' : 'bg-white border'}`}
                >
                    Шаблоны ({templates.length})
                </button>
            </div>

            {tab === 'catalog' && products.length > 0 && (
                <div className="mb-6 p-4 bg-white rounded-2xl border flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-gray-600">Выбрано: {selected.length}</span>
                    <button type="button" disabled={bulkLoading} onClick={() => runBulk('publish')} className="text-xs bg-green-100 px-3 py-1.5 rounded-lg">Показать</button>
                    <button type="button" disabled={bulkLoading} onClick={() => runBulk('hide')} className="text-xs bg-yellow-100 px-3 py-1.5 rounded-lg">Скрыть</button>
                    <button type="button" disabled={bulkLoading} onClick={() => runBulk('out_of_stock')} className="text-xs bg-red-100 px-3 py-1.5 rounded-lg">Нет в наличии</button>
                    <button type="button" onClick={() => setSelected(products.map(p => p.id))} className="text-xs text-pink-600 ml-auto">Все</button>
                    <button type="button" onClick={() => setSelected([])} className="text-xs text-gray-500">Сброс</button>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                    {error}
                    <button type="button" onClick={fetchMyProducts} className="ml-3 underline">
                        Повторить
                    </button>
                </div>
            )}

            {showForm && (
                <div className="bg-white p-8 rounded-3xl shadow mb-10">

                    <h2 className="text-2xl font-semibold mb-6">
                        {editingProduct
                            ? 'Редактирование товара'
                            : 'Новый товар'}
                    </h2>

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-2 gap-6"
                    >

                        <input
                            type="text"
                            placeholder="Название"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    name: e.target.value
                                })
                            }
                            required
                            className="border rounded-2xl px-5 py-4"
                        />

                        <input
                            type="number"
                            placeholder="Цена"
                            value={formData.price}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    price: e.target.value
                                })
                            }
                            required
                            className="border rounded-2xl px-5 py-4"
                        />

                        <input
                            type="text"
                            placeholder="Категория"
                            value={formData.category}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    category: e.target.value
                                })
                            }
                            required
                            className="border rounded-2xl px-5 py-4"
                        />

                        <ProductImageUpload
                            token={token}
                            images={formData.images}
                            onChange={images =>
                                setFormData({
                                    ...formData,
                                    images,
                                    image: images.find(s => s.trim()) || ''
                                })
                            }
                        />

                        <textarea
                            placeholder="Описание"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    description: e.target.value
                                })
                            }
                            className="col-span-2 border rounded-3xl px-5 py-4 h-32"
                        />

                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="border rounded-2xl px-5 py-4"
                        >
                            <option value="DRAFT">Черновик</option>
                            <option value="ACTIVE">В продаже</option>
                            <option value="HIDDEN">Скрыт</option>
                        </select>

                        <div>
                            <input
                                type="number"
                                min="0"
                                placeholder="Остаток (пусто = без лимита)"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                className="border rounded-2xl px-5 py-4 w-full"
                            />
                            <p className="text-xs text-amber-800 mt-1.5 bg-amber-50 rounded-lg px-2 py-1.5">
                                Для автоотключения при нуле укажите число (например 10). Пустое поле — остаток не уменьшается при заказах.
                            </p>
                        </div>

                        <label className="col-span-2 flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={formData.isOutOfStock}
                                onChange={e => setFormData({ ...formData, isOutOfStock: e.target.checked })}
                            />
                            Нет в наличии
                        </label>

                        <div className="col-span-2 flex gap-4">

                            <button
                                type="submit"
                                className="flex-1 bg-pink-600 text-white py-4 rounded-2xl"
                            >
                                {editingProduct
                                    ? 'Сохранить'
                                    : 'Добавить'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingProduct(null);
                                }}
                                className="flex-1 border py-4 rounded-2xl"
                            >
                                Отмена
                            </button>

                        </div>

                    </form>
                </div>
            )}

            {tab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    {templates.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500 py-12 bg-white rounded-3xl">
                            Нет шаблонов. Нажмите «В шаблон» на карточке товара.
                        </p>
                    ) : (
                        templates.map(t => (
                            <div key={t.id} className="bg-white rounded-3xl p-6 shadow border border-dashed border-pink-200">
                                <h3 className="font-semibold">{t.name}</h3>
                                <p className="text-pink-600 font-bold">{t.price} ₽</p>
                                <button
                                    type="button"
                                    onClick={() => handleDuplicate(t.id, { publish: true })}
                                    className="mt-4 w-full bg-pink-600 text-white py-2 rounded-xl text-sm"
                                >
                                    Создать товар из шаблона
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {tab === 'catalog' && products.length === 0 && !error ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                    <p className="text-gray-500 mb-4">Пока нет товаров</p>
                    <button
                        type="button"
                        onClick={() => { setShowForm(true); setEditingProduct(null); }}
                        className="bg-pink-600 text-white px-6 py-3 rounded-2xl"
                    >
                        + Добавить первый товар
                    </button>
                </div>
            ) : tab === 'catalog' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                    <div
                        key={product.id}
                        className={`bg-white rounded-3xl overflow-hidden shadow ${selected.includes(product.id) ? 'ring-2 ring-pink-500' : ''}`}
                    >
                        <div className="p-3 flex items-center gap-2 border-b border-gray-50">
                            <input
                                type="checkbox"
                                checked={selected.includes(product.id)}
                                onChange={() => toggleSelect(product.id)}
                            />
                            <span className="text-xs text-gray-500">Выбрать</span>
                        </div>
                        <img
                            src={productImageUrl(product)}
                            alt={product.name}
                            className="w-full h-52 object-cover"
                        />

                        <div className="p-6">

                            <div className="flex flex-wrap gap-2 items-start justify-between">
                                <h3 className="font-semibold">{product.name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${PRODUCT_STATUS[product.status]?.color || 'bg-gray-100'}`}>
                                    {PRODUCT_STATUS[product.status]?.label || product.status}
                                </span>
                            </div>

                            <p className="text-pink-600 font-bold text-2xl mt-1">{product.price} ₽</p>
                            <p className="text-sm text-gray-500">{product.category}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {product.isOutOfStock ? 'Нет в наличии' : product.stock != null ? `Остаток: ${product.stock}` : 'Остаток: ∞'}
                            </p>

                            <div className="flex flex-wrap gap-2 mt-4">
                                {product.status !== 'ACTIVE' && (
                                    <button type="button" onClick={() => handleQuick(product.id, 'publish')} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">Показать</button>
                                )}
                                {product.status === 'ACTIVE' && (
                                    <button type="button" onClick={() => handleQuick(product.id, 'hide')} className="text-xs bg-yellow-100 px-2 py-1 rounded-lg">Скрыть</button>
                                )}
                                {!product.isOutOfStock ? (
                                    <button type="button" onClick={() => handleQuick(product.id, 'out_of_stock')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg">Нет в наличии</button>
                                ) : (
                                    <button type="button" onClick={() => handleQuick(product.id, 'in_stock')} className="text-xs bg-green-100 px-2 py-1 rounded-lg">В наличии</button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3">
                                <button type="button" onClick={() => handleDuplicate(product.id, {})} className="text-xs border px-2 py-1 rounded-lg">Дублировать</button>
                                <button type="button" onClick={() => handleDuplicate(product.id, { asTemplate: true })} className="text-xs border px-2 py-1 rounded-lg">В шаблон</button>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button onClick={() => handleEdit(product)} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl text-sm">Изменить</button>
                                <button onClick={() => handleDelete(product.id)} className="flex-1 bg-red-600 text-white py-3 rounded-2xl text-sm">Удалить</button>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
            ) : null}

        </div>
    );
}

function ShopProducts() {
    return (
        <ShopAuthGate>
            <ShopProductsContent />
        </ShopAuthGate>
    );
}

export default ShopProducts;