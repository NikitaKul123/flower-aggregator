import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import ChatBox from '../components/ChatBox';

function ShopChat() {
    const { orderId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('channel') === 'shop-courier' ? 'courier' : 'shop';
    const [meta, setMeta] = useState({ shopCourierChatAvailable: false });

    const selectTab = (next) => {
        if (next === 'courier') {
            setSearchParams({ channel: 'shop-courier' }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    };

    const handleMetaLoaded = (m) => {
        setMeta(prev => ({
            ...prev,
            ...m,
            shopCourierChatAvailable: !!(m.shopCourierChatAvailable ?? m.courierChatAvailable)
        }));
    };

    const showCourierTab = meta.shopCourierChatAvailable;

    return (
        <div className="h-full max-w-3xl mx-auto w-full px-4 sm:px-6 py-3 overflow-hidden flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 shrink-0 mb-2 sm:mb-3">
                Чат заказа #{orderId}
            </h1>
            <Link to="/shop/orders" className="text-pink-600 hover:underline text-sm mb-2 shrink-0 inline-block">
                ← К заказам
            </Link>

            {showCourierTab ? (
                <div className="flex gap-2 mb-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => selectTab('shop')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium ${
                            tab === 'shop' ? 'bg-pink-600 text-white' : 'bg-white border border-gray-200'
                        }`}
                    >
                        Клиент
                    </button>
                    <button
                        type="button"
                        onClick={() => selectTab('courier')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium ${
                            tab === 'courier' ? 'bg-pink-600 text-white' : 'bg-white border border-gray-200'
                        }`}
                    >
                        Курьер
                    </button>
                </div>
            ) : (
                <p className="text-xs text-gray-500 mb-2 shrink-0">
                    Чат с курьером появится после назначения курьера (не самовывоз).
                </p>
            )}

            <ChatBox
                orderId={orderId}
                channel={tab === 'courier' ? 'SHOP_COURIER' : 'SHOP'}
                isShop
                onMetaLoaded={handleMetaLoaded}
            />
        </div>
    );
}

export default ShopChat;
