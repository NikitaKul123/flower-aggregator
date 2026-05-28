import { useEffect, useState, useRef, useContext } from 'react';
import axios from 'axios';
import { createAuthenticatedSocket } from '../utils/socketClient';
import { AuthContext } from '../context/AuthContext';
import { cardClass, inputClass, btnPink, btnSecondary } from '../utils/ui';
import { dispatchOrdersUpdated, setActiveChatChannel, clearActiveChatChannel } from '../utils/notifications';
import { channelQueryString } from '../utils/chatChannel';
import { isAxiosCanceled } from '../utils/axiosHelpers';
import Avatar from './Avatar';

import { API_BASE as API } from '../config/api';

function MessageStatus({ isMine, message }) {
    if (!isMine) return null;
    return (
        <span className="text-[10px] opacity-80 ml-2 whitespace-nowrap">
            {message.isRead ? '✓✓' : '✓'}
            <span className="sr-only">{message.isRead ? ' прочитано' : ' доставлено'}</span>
        </span>
    );
}

export default function ChatBox({
    orderId,
    backLink,
    channel = 'SHOP',
    isShop = false,
    isCourier = false,
    readOnly: readOnlyProp = false,
    onMetaLoaded
}) {
    const { token, user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [chatMeta, setChatMeta] = useState({ shop: null, customer: null, courier: null });
    const [readOnly, setReadOnly] = useState(readOnlyProp);
    const [text, setText] = useState('');
    const [typing, setTyping] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const typingTimeout = useRef(null);
    const socketRef = useRef(null);
    const messagesRef = useRef(null);
    const onMetaLoadedRef = useRef(onMetaLoaded);
    onMetaLoadedRef.current = onMetaLoaded;

    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const scrollMessagesToBottom = (behavior = 'auto') => {
        const el = messagesRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior });
    };

    const isNearBottom = () => {
        const el = messagesRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    };

    const isMine = (m) => {
        if (channel === 'SHOP_COURIER') {
            if (isShop) return m.isFromShop;
            if (isCourier) return m.isFromCourier;
            return false;
        }
        if (channel === 'COURIER') {
            if (isCourier) return m.isFromCourier;
            return !m.isFromCourier;
        }
        if (isShop) return m.isFromShop;
        return !m.isFromShop && !m.isFromCourier;
    };

    useEffect(() => {
        if (!isNearBottom()) return;
        const id = requestAnimationFrame(() => scrollMessagesToBottom('smooth'));
        return () => cancelAnimationFrame(id);
    }, [messages, typing]);

    useEffect(() => {
        setReadOnly(readOnlyProp);
    }, [readOnlyProp]);

    useEffect(() => {
        if (!orderId) return;
        const actor = isCourier ? 'courier' : isShop ? 'shop' : 'customer';
        setActiveChatChannel({ orderId: Number(orderId), channel, actor });
        return () => clearActiveChatChannel();
    }, [orderId, channel, isCourier, isShop]);

    useEffect(() => {
        if (!token || !user || !orderId) return;

        let active = true;
        const channelQ = channelQueryString(channel);
        setMessages([]);
        setLoadError('');

        const loadMessages = async () => {
            const res = await axios.get(
                `${API}/api/messages/order/${orderId}?${channelQ}`,
                auth
            );
            if (!active) return;
            const data = res.data;
            const list = Array.isArray(data) ? data : data.messages || [];
            setMessages(list);
            setLoadError('');
            if (!Array.isArray(data)) {
                const meta = {
                    shop: data.shop,
                    customer: data.customer,
                    courier: data.courier,
                    courierChatAvailable: data.courierChatAvailable,
                    shopCourierChatAvailable: data.shopCourierChatAvailable ?? data.courierChatAvailable
                };
                setChatMeta(meta);
                setReadOnly(readOnlyProp || !!data.readOnly);
                onMetaLoadedRef.current?.(meta);
            }
        };

        const safeLoadMessages = () => {
            loadMessages().catch((e) => {
                if (!active || isAxiosCanceled(e)) return;
                console.error(e);
            });
        };

        const markReadAndLoad = async () => {
            try {
                if (!readOnlyProp) {
                    await axios.put(
                        `${API}/api/messages/order/${orderId}/read?${channelQ}`,
                        {},
                        auth
                    );
                }
            } catch (e) {
                if (!active || isAxiosCanceled(e)) return;
                console.error('mark read:', e.response?.data?.error || e.message);
            }
            if (!active) return;
            try {
                await loadMessages();
                if (active) dispatchOrdersUpdated();
            } catch (e) {
                if (!active || isAxiosCanceled(e)) return;
                let hint = e.response?.data?.error || e.message;
                if (e.response?.status === 404) {
                    hint = 'Чат не найден. Проверьте заказ и перезапустите backend (порт 5000).';
                } else if (e.message === 'Network Error') {
                    hint = `Не удалось связаться с сервером (${API})`;
                }
                setLoadError(hint);
                console.error(e);
            }
        };

        void markReadAndLoad().catch((e) => {
            if (!active || isAxiosCanceled(e)) return;
            console.error(e);
        });

        if (isShop && channel === 'SHOP') {
            axios.get(`${API}/api/messages/templates`, auth)
                .then(r => { if (active) setTemplates(r.data); })
                .catch((e) => { if (!isAxiosCanceled(e)) { /* ignore */ } });
        }

        const socket = createAuthenticatedSocket(token);
        socketRef.current = socket;

        let socketUserId = user.id;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            socketUserId = payload.userId || user.id;
        } catch { /* ignore */ }

        if (isShop) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.shopId) socket.emit('join_shop', payload.shopId);
            } catch { /* ignore */ }
        } else if (isCourier) {
            socket.emit('join_courier', socketUserId);
        } else {
            socket.emit('join_customer', socketUserId);
        }
        socket.emit('join_order', Number(orderId));

        socket.on('new_message', (msg) => {
            if (msg.orderId !== Number(orderId)) return;
            if ((msg.channel || 'SHOP') !== channel) return;
            setMessages(prev => {
                if (prev.some(x => x.id === msg.id)) return prev;
                return [...prev, msg];
            });
            let incoming = false;
            if (channel === 'SHOP_COURIER') {
                incoming = isShop ? msg.isFromCourier : isCourier ? msg.isFromShop : false;
            } else if (isShop) {
                incoming = msg.isFromShop === false;
            } else if (isCourier) {
                incoming = !msg.isFromCourier;
            } else {
                incoming = msg.isFromShop || msg.isFromCourier;
            }
            if (incoming && !readOnlyProp) {
                axios.put(`${API}/api/messages/order/${orderId}/read?${channelQueryString(channel)}`, {}, auth)
                    .then(() => {
                        if (!active) return;
                        safeLoadMessages();
                        dispatchOrdersUpdated();
                    })
                    .catch((e) => { if (!isAxiosCanceled(e)) { /* ignore */ } });
            }
        });

        socket.on('messages_read', ({ orderId: oid, channel: ch }) => {
            if (Number(oid) !== Number(orderId)) return;
            if (ch && ch !== channel) return;
            safeLoadMessages();
        });

        return () => {
            active = false;
            socket.disconnect();
        };
    }, [token, user, orderId, isShop, isCourier, channel, readOnlyProp]);

    const emitTyping = (active) => {
        if (channel !== 'SHOP' || readOnly) return;
        socketRef.current?.emit(active ? 'typing_start' : 'typing_stop', {
            orderId: Number(orderId),
            isShop
        });
    };

    const onInputChange = (value) => {
        setText(value);
        emitTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => emitTyping(false), 1200);
    };

    const sendPayload = async (payload) => {
        const res = await axios.post(
            `${API}/api/messages/order/${orderId}`,
            { ...payload, channel },
            auth
        );
        setMessages(prev => {
            if (prev.some(x => x.id === res.data.id)) return prev;
            return [...prev, res.data];
        });
    };

    const send = async () => {
        if (!text.trim() || readOnly) return;
        try {
            await sendPayload({ text: text.trim() });
            setText('');
            emitTyping(false);
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.error || 'Ошибка отправки');
        }
    };

    const sendTemplate = (tpl) => {
        setText(tpl);
    };

    const onImagePick = async (e) => {
        const file = e.target.files?.[0];
        if (!file || readOnly) return;
        if (!file.type.startsWith('image/')) {
            alert('Только изображения');
            return;
        }
        setUploading(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            await sendPayload({ imageBase64: base64, text: text.trim() || undefined });
            setText('');
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка загрузки фото');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const imageSrc = (url) => (url?.startsWith('http') ? url : `${API}${url}`);

    const avatarFor = (m, mine) => {
        if (mine) {
            if (isCourier) {
                return { src: user?.avatar, name: user?.name };
            }
            if (isShop) {
                return { src: user?.shopAvatar || chatMeta.shop?.avatar, name: chatMeta.shop?.name || user?.shopName };
            }
            return {
                src: chatMeta.customer?.avatar || user?.avatar || m.user?.avatar,
                name: chatMeta.customer?.name || user?.name
            };
        }
        if (channel === 'SHOP_COURIER') {
            if (isShop) {
                return { src: chatMeta.courier?.avatar, name: chatMeta.courier?.name };
            }
            if (isCourier) {
                return { src: chatMeta.shop?.avatar, name: chatMeta.shop?.name };
            }
        }
        if (channel === 'COURIER') {
            if (isCourier) {
                return {
                    src: chatMeta.customer?.avatar || m.user?.avatar,
                    name: chatMeta.customer?.name || m.user?.name
                };
            }
            return { src: chatMeta.courier?.avatar, name: chatMeta.courier?.name };
        }
        if (isShop) {
            return { src: chatMeta.customer?.avatar || m.user?.avatar, name: chatMeta.customer?.name || m.user?.name };
        }
        return { src: chatMeta.shop?.avatar, name: chatMeta.shop?.name };
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {backLink}

            <div className={`${cardClass} flex flex-col flex-1 min-h-0 overflow-hidden`}>
                <div
                    ref={messagesRef}
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3"
                >
                    {loadError && (
                        <div className="text-red-600 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-center mb-3">
                            {loadError}
                        </div>
                    )}
                    {!loadError && messages.length === 0 && (
                        <div className="text-gray-400 text-center py-10">Сообщений пока нет</div>
                    )}
                    {messages.map(m => {
                        const mine = isMine(m);
                        const av = avatarFor(m, mine);
                        return (
                            <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                                {!mine && <Avatar src={av.src} name={av.name} size="sm" />}
                                <div
                                    className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-sm ${
                                        mine ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                >
                                    {m.imageUrl && (
                                        <img
                                            src={imageSrc(m.imageUrl)}
                                            alt=""
                                            className="rounded-xl max-h-48 mb-2 w-full object-cover"
                                        />
                                    )}
                                    {m.text && (
                                        <div className="flex items-end justify-between gap-2">
                                            <span>{m.text}</span>
                                            <MessageStatus isMine={mine} message={m} />
                                        </div>
                                    )}
                                    {!m.text && m.imageUrl && (
                                        <div className="text-right">
                                            <MessageStatus isMine={mine} message={m} />
                                        </div>
                                    )}
                                </div>
                                {mine && <Avatar src={av.src} name={av.name} size="sm" />}
                            </div>
                        );
                    })}
                    {typing && channel === 'SHOP' && (
                        <div className="text-sm text-gray-500 italic px-2">
                            {isShop ? 'Клиент печатает…' : 'Магазин печатает…'}
                        </div>
                    )}
                </div>

                {isShop && channel === 'SHOP' && templates.length > 0 && !readOnly && (
                    <div className="shrink-0 flex flex-wrap gap-2 px-4 sm:px-6 py-2 border-t border-gray-100 bg-gray-50/80">
                        {templates.map((tpl, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => sendTemplate(tpl)}
                                className="text-xs sm:text-sm bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:border-pink-400"
                            >
                                {tpl.length > 40 ? tpl.slice(0, 40) + '…' : tpl}
                            </button>
                        ))}
                    </div>
                )}

                {readOnly ? (
                    <div className="shrink-0 border-t border-gray-100 bg-gray-50 p-3 text-center text-sm text-gray-500">
                        Только просмотр
                    </div>
                ) : (
                    <div className="shrink-0 border-t border-gray-100 bg-white p-3 sm:p-4 flex flex-col sm:flex-row gap-2">
                        <input
                            value={text}
                            onChange={e => onInputChange(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                            className={inputClass()}
                            placeholder="Сообщение..."
                        />
                        <label className={`${btnSecondary} px-4 py-3 text-center cursor-pointer text-sm sm:shrink-0`}>
                            📷
                            <input type="file" accept="image/*" className="hidden" onChange={onImagePick} disabled={uploading} />
                        </label>
                        <button type="button" onClick={send} disabled={uploading} className={`${btnPink} px-6 py-3 sm:shrink-0`}>
                            {uploading ? '…' : 'Отправить'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
