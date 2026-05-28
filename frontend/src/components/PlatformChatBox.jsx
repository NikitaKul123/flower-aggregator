import { useContext, useEffect, useRef, useState } from 'react';
import { createAuthenticatedSocket } from '../utils/socketClient';
import { AuthContext } from '../context/AuthContext';
import { cardClass, inputClass, btnPink } from '../utils/ui';
import { mediaUrl } from '../utils/media';
import { isSuperAdminUser } from '../utils/roles';

function dedupeMessages(list) {
    const byId = new Map();
    for (const m of list) {
        if (m?.id != null) byId.set(m.id, m);
    }
    return Array.from(byId.values()).sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
}

function upsertMessage(prev, msg) {
    if (msg?.id == null) return [...prev, msg];
    const idx = prev.findIndex((m) => m.id === msg.id);
    if (idx >= 0) {
        const next = [...prev];
        next[idx] = msg;
        return next;
    }
    return dedupeMessages([...prev, msg]);
}

export default function PlatformChatBox({
    shopId,
    loadMessages,
    sendMessage,
    partnerLabel = 'Платформа',
    accentClass = 'bg-violet-600'
}) {
    const { token, user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [resolvedShopId, setResolvedShopId] = useState(shopId ?? null);
    const listRef = useRef(null);
    const socketRef = useRef(null);
    const pollRef = useRef(null);

    const isAdmin = isSuperAdminUser(user);
    const activeShopId = shopId ?? resolvedShopId;

    const scrollBottom = () => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    };

    const refresh = async () => {
        if (!token) return;
        try {
            const data = await loadMessages(token);
            if (data.shopId != null) setResolvedShopId(data.shopId);
            setMessages(dedupeMessages(data.messages || []));
            setError('');
        } catch (e) {
            setError(e.response?.data?.error || 'Не удалось загрузить чат');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shopId != null) setResolvedShopId(shopId);
    }, [shopId]);

    useEffect(() => {
        setLoading(true);
        refresh();
    }, [token, shopId]);

    useEffect(() => {
        scrollBottom();
    }, [messages]);

    useEffect(() => {
        if (!token) return;

        const onMessage = (msg) => {
            const msgShopId = msg.shopId ?? activeShopId;
            if (
                activeShopId != null &&
                msgShopId != null &&
                Number(msgShopId) !== Number(activeShopId)
            ) {
                return;
            }
            setMessages((prev) => upsertMessage(prev, msg));
        };

        const socket = createAuthenticatedSocket(token);
        socketRef.current = socket;

        const onConnect = () => {
            if (!isAdmin && activeShopId) {
                socket.emit('join_shop', activeShopId);
            }
        };

        socket.on('connect', onConnect);
        socket.on('platform_message', onMessage);
        if (socket.connected) onConnect();

        pollRef.current = window.setInterval(() => {
            if (document.visibilityState === 'visible') refresh();
        }, 12000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            socket.off('connect', onConnect);
            socket.off('platform_message', onMessage);
            socket.disconnect();
        };
    }, [token, activeShopId, isAdmin]);

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        setSending(true);
        try {
            const msg = await sendMessage(token, trimmed);
            setMessages((prev) => upsertMessage(prev, msg));
            setText('');
        } catch (err) {
            alert(err.response?.data?.error || 'Не удалось отправить');
        } finally {
            setSending(false);
        }
    };

    const mine = (m) => (isAdmin ? m.isFromPlatform : !m.isFromPlatform);

    return (
        <div className={`${cardClass} flex flex-col h-[min(70vh,560px)]`}>
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                <p className="font-semibold text-gray-900">Чат с {partnerLabel}</p>
                <p className="text-xs text-gray-500">Модерация, вопросы по работе на платформе</p>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                    <p className="text-gray-500 text-sm text-center py-8">Загрузка…</p>
                ) : error ? (
                    <p className="text-red-600 text-sm text-center py-8">{error}</p>
                ) : messages.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">
                        Напишите первое сообщение — поддержка платформы ответит здесь.
                    </p>
                ) : (
                    messages.map((m) => (
                        <div
                            key={m.id}
                            className={`flex ${mine(m) ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                                    mine(m)
                                        ? `${accentClass} text-white`
                                        : 'bg-gray-100 text-gray-900'
                                }`}
                            >
                                {!mine(m) && (
                                    <p className="text-[10px] opacity-70 mb-0.5">
                                        {m.isFromPlatform ? 'Платформа' : m.sender?.name || 'Магазин'}
                                    </p>
                                )}
                                {m.text && <p>{m.text}</p>}
                                {m.imageUrl && (
                                    <img
                                        src={mediaUrl(m.imageUrl)}
                                        alt=""
                                        className="mt-2 max-h-40 rounded-lg"
                                    />
                                )}
                                <p
                                    className={`text-[10px] mt-1 ${mine(m) ? 'text-white/70' : 'text-gray-400'}`}
                                >
                                    {new Date(m.createdAt).toLocaleString('ru-RU')}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex gap-2 shrink-0">
                <input
                    className={inputClass()}
                    placeholder="Сообщение…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className={`${btnPink} px-4 py-2 shrink-0 disabled:opacity-50`}
                >
                    →
                </button>
            </form>
        </div>
    );
}
