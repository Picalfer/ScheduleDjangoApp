const CACHE_NAME = 'kodama-school-v1';
const urlsToCache = [
    '/static/core/css/base.css',
    '/static/core/css/create_user.css',
    // добавьте другие статические файлы
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
    // Не кэшируем POST запросы и API запросы
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(function (response) {
                // Возвращаем кэш если есть, иначе делаем запрос
                return response || fetch(event.request);
            })
            .catch(function () {
                // Fallback если всё fails
                return caches.match('/offline.html'); // можно создать offline страницу
            })
    );
});