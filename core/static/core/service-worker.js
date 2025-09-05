// static/core/js/service-worker.js
const CACHE_NAME = 'kodama-school-v1';
const urlsToCache = [
    '/',
    '/static/core/css/base.css',
    '/static/core/css/create_user.css',
    '/static/core/js/main.js',
    // добавьте другие важные статические файлы
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request)
            .then(function (response) {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request);
                }
            )
    );
});