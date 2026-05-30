/* Service Worker — Web Push */

function normalizePath(raw) {
    if (!raw) return '/';
    let path = String(raw);
    if (path.startsWith('http')) {
        try {
            const u = new URL(path);
            if (u.origin === self.location.origin) {
                return u.pathname + u.search + u.hash;
            }
            return path;
        } catch {
            return '/';
        }
    }
    return path.startsWith('/') ? path : `/${path}`;
}

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data?.text() || '' };
    }

    const path = normalizePath(data.path || data.url);
    const title = data.title || 'FlowerShop';
    const options = {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag || 'flowershop',
        renotify: true,
        data: { path, url: data.url || path }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const raw = event.notification.data?.path || event.notification.data?.url || '/';
    const path = normalizePath(raw);

    if (path.startsWith('http')) {
        event.waitUntil(clients.openWindow(path));
        return;
    }

    const fullUrl = new URL(path, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.startsWith(self.location.origin)) {
                    client.postMessage({ type: 'PUSH_NAVIGATE', path });
                    return client.focus();
                }
            }
            return clients.openWindow(fullUrl);
        })
    );
});

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});
