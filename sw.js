const CACHE_NAME = 't35-static-v1';
const STATIC_ASSETS = [
    '/assets/img/t35logo.png',
    '/assets/img/t35-android.png',
    '/assets/img/t35-ios.png',
    '/assets/img/favi-t35.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin === self.location.origin && url.pathname.startsWith('/assets/img/')) {
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
        return;
    }

    // HTML, JS, chamadas ao Firebase etc. sempre vão direto pra rede —
    // cache aqui arriscaria mostrar curso/status desatualizado.
    event.respondWith(fetch(event.request));
});
