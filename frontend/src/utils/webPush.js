import {
    fetchVapidPublicKey,
    subscribePushOnServer,
    unsubscribePushOnServer,
    unsubscribeAllPushOnServer
} from '../api/pushApi';

const SUBSCRIBED_KEY = 'flower_web_push_subscribed';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
    return arr;
}

export function isWebPushSupported() {
    return (
        typeof window !== 'undefined'
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && typeof Notification !== 'undefined'
    );
}

export function isWebPushSubscribedInApp() {
    try {
        return localStorage.getItem(SUBSCRIBED_KEY) === '1';
    } catch {
        return false;
    }
}

function setSubscribedFlag(value) {
    try {
        if (value) localStorage.setItem(SUBSCRIBED_KEY, '1');
        else localStorage.removeItem(SUBSCRIBED_KEY);
    } catch {
        // ignore
    }
}

export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        return reg;
    } catch (err) {
        console.error('SW register failed', err);
        return null;
    }
}

export async function subscribeToWebPush(token) {
    if (!isWebPushSupported()) {
        return { ok: false, reason: 'unsupported' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        return { ok: false, reason: permission };
    }

    const publicKey = await fetchVapidPublicKey();
    if (!publicKey) {
        return { ok: false, reason: 'no-vapid' };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
        return { ok: false, reason: 'no-sw' };
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
    }

    await subscribePushOnServer(token, subscription.toJSON());
    setSubscribedFlag(true);
    return { ok: true, subscription };
}

export async function unsubscribeFromWebPush(token) {
    setSubscribedFlag(false);

    try {
        await unsubscribeAllPushOnServer(token);
    } catch {
        // ignore
    }

    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
        try {
            await unsubscribePushOnServer(token, subscription.endpoint);
        } catch {
            // ignore
        }
        await subscription.unsubscribe();
    }

    return { ok: true };
}

/** iOS: надёжнее через «На экран Домой» */
export function isLikelyIos() {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalonePwa() {
    return (
        window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
    );
}
