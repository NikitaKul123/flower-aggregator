import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    fetchSuperAdminPlatformChat,
    sendSuperAdminPlatformMessage
} from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import PlatformChatBox from '../components/PlatformChatBox';

export default function SuperAdminShopChat() {
    const { shopId } = useParams();
    const { token } = useContext(AuthContext);
    const [shop, setShop] = useState(null);

    useEffect(() => {
        if (!token || !shopId) return;
        fetchSuperAdminPlatformChat(token, shopId)
            .then((data) => setShop(data.shop))
            .catch(console.error);
    }, [token, shopId]);

    return (
        <SuperAdminLayout title={shop ? `Чат: ${shop.name}` : 'Чат с магазином'}>
            <Link
                to="/super-admin/shop-chats"
                className="text-sm text-violet-600 hover:underline mb-4 inline-block"
            >
                ← Все чаты с магазинами
            </Link>
            {shop && (
                <p className="text-sm text-gray-500 mb-4">
                    {shop.owner?.name} · {shop.owner?.email}
                </p>
            )}
            <PlatformChatBox
                shopId={shopId}
                partnerLabel={shop?.name || 'магазином'}
                accentClass="bg-violet-600"
                loadMessages={(t) => fetchSuperAdminPlatformChat(t, shopId)}
                sendMessage={(t, text) => sendSuperAdminPlatformMessage(t, shopId, text)}
            />
        </SuperAdminLayout>
    );
}
