// LINK — service worker: минимальный офлайн-кэш "оболочки" приложения.
// Сам текст книги никогда не кэшируется здесь — он либо в IndexedDB (см. index.html),
// либо загружается пользователем заново; сервис-воркер отвечает только за то,
// чтобы САМО приложение открывалось без сети.

const CACHE_VERSION = 'link-shell-v2';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './jszip.min.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // не трогаем POST к api.groq.com и т.п.

    // Сама страница: сеть в приоритете (чтобы видеть свежую версию онлайн),
    // но при отсутствии сети — открываем из кэша, чтобы приложение вообще запустилось
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Всё остальное (иконки, шрифты, манифест) — кэш в приоритете, сеть как дополнение
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((res) => {
                if (res && res.status === 200) {
                    caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
                }
                return res;
            }).catch(() => cached);
        })
    );
});
