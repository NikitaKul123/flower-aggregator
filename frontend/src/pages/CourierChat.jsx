import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import ChatBox from '../components/ChatBox';

function CourierChat() {
    const { orderId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') === 'shop' ? 'shop' : 'client';
    const [meta, setMeta] = useState({ shopCourierChatAvailable: false });

    const selectTab = (next) => {
        if (next === 'shop') {
            setSearchParams({ tab: 'shop' }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    };

    const handleMetaLoaded = (m) => {
        setMeta(prev => ({
            ...prev,
            shopCourierChatAvailable: !!(m.shopCourierChatAvailable ?? m.courierChatAvailable ?? prev.shopCourierChatAvailable)
        }));
    };

    return (
        <div className="h-full max-w-3xl mx-auto w-full px-4 sm:px-6 py-3 overflow-hidden flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 shrink-0 mb-2">
                Чат · заказ #{orderId}
            </h1>
            <Link to="/courier/orders" className="text-pink-600 hover:underline text-sm mb-2 shrink-0 inline-block">
                ← К доставкам
            </Link>

            <div className="flex gap-2 mb-3 shrink-0">
                <button
                    type="button"
                    onClick={() => selectTab('client')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ${
                        tab === 'client' ? 'bg-pink-600 text-white' : 'bg-white border border-gray-200'
                    }`}
                >
                    Клиент
                </button>
                <button
                    type="button"
                    onClick={() => selectTab('shop')}
                    disabled={!meta.shopCourierChatAvailable && tab !== 'shop'}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ${
                        tab === 'shop' ? 'bg-pink-600 text-white' : 'bg-white border border-gray-200'
                    } ${!meta.shopCourierChatAvailable && tab !== 'shop' ? 'opacity-50' : ''}`}
                >
                    Магазин
                </button>
            </div>

            <ChatBox
                orderId={orderId}
                channel={tab === 'shop' ? 'SHOP_COURIER' : 'COURIER'}
                isCourier
                onMetaLoaded={handleMetaLoaded}
            />
        </div>
    );
}

export default CourierChat;
