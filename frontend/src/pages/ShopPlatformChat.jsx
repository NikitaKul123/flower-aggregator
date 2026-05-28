import { Link } from 'react-router-dom';
import ShopAuthGate from '../components/ShopAuthGate';
import PlatformChatBox from '../components/PlatformChatBox';
import {
    fetchShopPlatformChat,
    sendShopPlatformMessage
} from '../api/shopPlatformChatApi';
import { pageTitleClass } from '../utils/ui';

export default function ShopPlatformChat() {
    return (
        <ShopAuthGate>
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <Link to="/shop/dashboard" className="text-pink-600 hover:underline text-sm mb-4 inline-block">
                    ← Дашборд
                </Link>
                <h1 className={`${pageTitleClass} mb-4`}>Поддержка платформы</h1>
                <PlatformChatBox
                    partnerLabel="платформой"
                    accentClass="bg-pink-600"
                    loadMessages={fetchShopPlatformChat}
                    sendMessage={async (token, text) => sendShopPlatformMessage(token, text)}
                />
            </div>
        </ShopAuthGate>
    );
}
