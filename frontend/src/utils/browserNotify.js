import { ORDER_STATUS_LABELS as STATUS_LABELS } from './orderStatuses';

const STORAGE_KEY = 'flower_browser_push_enabled';

/** В приложении пользователь разрешил push */
let appAllowsBrowserPush = readBrowserPushFromStorage();

function readBrowserPushFromStorage() {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === '0') return false;
        if (v === '1') return true;
    } catch {
        // ignore
    }
    return true;
}

export function isBrowserPushEnabledInApp() {
    return appAllowsBrowserPush;
}

export function syncBrowserPushPreference(enabled) {
    appAllowsBrowserPush = enabled !== false;
    try {
        localStorage.setItem(STORAGE_KEY, appAllowsBrowserPush ? '1' : '0');
    } catch {
        // ignore
    }
}

export function getBrowserNotificationPermission() {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
}

export function getBrowserPushPermissionLabel(permission = getBrowserNotificationPermission()) {
    switch (permission) {
        case 'granted': return 'Разрешено в браузере';
        case 'denied': return 'Запрещено в браузере';
        case 'default': return 'Ещё не запрашивали';
        default: return 'Не поддерживается';
    }
}

export async function requestBrowserNotificationPermission() {
    if (typeof Notification === 'undefined') return 'unsupported';

    try {
        if (typeof Notification.requestPermission === 'function') {
            return await Notification.requestPermission();
        }
        return new Promise((resolve) => {
            Notification.requestPermission(resolve);
        });
    } catch {
        return getBrowserNotificationPermission();
    }
}

export function canShowBrowserNotifications() {
    return (
        appAllowsBrowserPush
        && typeof Notification !== 'undefined'
        && Notification.permission === 'granted'
    );
}

export function dispatchBrowserPushChanged(enabled) {
    window.dispatchEvent(
        new CustomEvent('browser-push-changed', {
            detail: { enabled: enabled !== false }
        })
    );
}

function showBrowserNotification({ title, body, tag, href }) {
    if (!canShowBrowserNotifications()) {
        return false;
    }
    try {
        const n = new Notification(title, {
            body,
            tag,
            renotify: true,
            icon: '/favicon.ico'
        });
        n.onclick = () => {
            window.focus();
            window.location.href = href;
            n.close();
        };
        return true;
    } catch {
        return false;
    }
}

export function showOrderStatusBrowserNotification({ orderId, status }) {
    const label = STATUS_LABELS[status] || status;
    const tag = `order-status-${orderId}-${Date.now()}`;
    return showBrowserNotification({
        title: `Заказ №${orderId}`,
        body: `Статус: ${label}`,
        tag,
        href: '/orders'
    });
}

export function showChatBrowserNotification({ orderId, text, imageUrl, isShop }) {
    const href = isShop
        ? `/shop/orders/${orderId}/chat`
        : `/orders/${orderId}/chat`;

    let body = 'Новое сообщение';
    if (text?.trim()) {
        body = text.trim().length > 120 ? `${text.trim().slice(0, 117)}…` : text.trim();
    } else if (imageUrl) {
        body = '📷 Фото';
    }

    return showBrowserNotification({
        title: `Чат · заказ №${orderId}`,
        body,
        tag: `order-chat-${orderId}-${Date.now()}`,
        href
    });
}
