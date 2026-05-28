import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import ChatBox from '../components/ChatBox';

function CustomerChat() {
    const { orderId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('channel') === 'courier' ? 'courier' : 'shop';
    const [meta, setMeta] = useState({ courier: null, courierChatAvailable: false });

    const selectTab = (next) => {
        if (next === 'courier') {
            setSearchParams({ channel: 'courier' }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    };

    const showCourierTab = meta.courierChatAvailable;

    return (
        <div className="h-full max-w-3xl mx-auto w-full px-4 sm:px-6 py-3 overflow-hidden flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 shrink-0 mb-2 sm:mb-3">
                Чат заказа #{orderId}
            </h1>
            <Link to="/orders" className="text-pink-600 hover:underline text-sm mb-2 shrink-0 inline-block">
                ← К заказам
            </Link>

            {showCourierTab && (
                <div className="flex gap-2 mb-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => selectTab('shop')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium ${
                            tab === 'shop' ? 'bg-pink-600 text-white' : 'bg-white border border-gray-200'
                        }`}
                    >
                        Магазин
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
            )}

            {tab === 'courier' && meta.courier && (
                <div className="shrink-0 mb-3 p-3 bg-orange-50 border border-orange-100 rounded-xl text-sm">
                    <p className="font-medium">{meta.courier.name}</p>
                    {meta.courier.phone && (
                        <a href={`tel:${meta.courier.phone}`} className="text-pink-600 hover:underline">
                            {meta.courier.phone}
                        </a>
                    )}
                </div>
            )}

            <ChatBox
                orderId={orderId}
                channel={tab === 'courier' ? 'COURIER' : 'SHOP'}
                isShop={false}
                onMetaLoaded={setMeta}
            />
        </div>
    );
}

export default CustomerChat;
