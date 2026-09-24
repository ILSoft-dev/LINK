// LINK — service worker: минимальный офлайн-кэш "оболочки" приложения.
// Сам текст книги никогда не кэшируется здесь — он либо в IndexedDB (см. index.html),
// либо загружается пользователем заново; сервис-воркер отвечает только за то,
// чтобы САМО приложение открывалось без сети.

const CACHE_VERSION = 'link-shell-v17';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './jszip.min.js',
    './pdf.min.mjs',
    './pdf.worker.min.mjs',
    './fonts.css',
    './fonts/pt-serif-latin-400-normal.woff2',
    './fonts/pt-serif-cyrillic-400-normal.woff2',
    './fonts/pt-serif-cyrillic-ext-400-normal.woff2',
    './fonts/pt-serif-latin-700-normal.woff2',
    './fonts/pt-serif-cyrillic-700-normal.woff2',
    './fonts/pt-serif-cyrillic-ext-700-normal.woff2',
    './fonts/pt-serif-latin-400-italic.woff2',
    './fonts/pt-serif-cyrillic-400-italic.woff2',
    './fonts/pt-serif-cyrillic-ext-400-italic.woff2',
    './fonts/pt-serif-latin-700-italic.woff2',
    './fonts/pt-serif-cyrillic-700-italic.woff2',
    './fonts/pt-serif-cyrillic-ext-700-italic.woff2',
    './fonts/lora-latin-600-normal.woff2',
    './fonts/lora-cyrillic-600-normal.woff2',
    './fonts/lora-cyrillic-ext-600-normal.woff2',
    './fonts/lora-latin-700-normal.woff2',
    './fonts/lora-cyrillic-700-normal.woff2',
    './fonts/lora-cyrillic-ext-700-normal.woff2',
    './fonts/inter-latin-400-normal.woff2',
    './fonts/inter-cyrillic-400-normal.woff2',
    './fonts/inter-cyrillic-ext-400-normal.woff2',
    './fonts/inter-latin-500-normal.woff2',
    './fonts/inter-cyrillic-500-normal.woff2',
    './fonts/inter-cyrillic-ext-500-normal.woff2',
    './fonts/inter-latin-600-normal.woff2',
    './fonts/inter-cyrillic-600-normal.woff2',
    './fonts/inter-cyrillic-ext-600-normal.woff2',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
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
