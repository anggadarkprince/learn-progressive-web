const CACHE_STATIC_NAME = 'app-static-v3';
const CACHE_DYNAMIC_NAME = 'app-dynamic-v1';

self.addEventListener('install', function (event) {
    console.log('[Service Worker] Installing Service Worker...', event);
    event.waitUntil(caches.open(CACHE_STATIC_NAME).then(function (cache) {
        console.log('[Service Worker] precaching app shell');
        cache.addAll([
            '/',
            '/index.html',
            '/src/js/app.js',
            '/src/js/feed.js',
            '/src/js/promise.js',
            '/src/js/fetch.js',
            '/src/js/material.min.js',
            '/src/css/app.css',
            '/src/css/feed.css',
            '/src/images/main-image.jpg',
            'https://fonts.googleapis.com/css?family=Roboto:400,700',
            'https://fonts.googleapis.com/icon?family=Material+Icons',
            'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.purple-deep_purple.min.css',
        ]);
    }));
});

self.addEventListener('activate', function (event) {
    console.log('[Service Worker] Activating Service Worker...', event);
    event.waitUntil(
        caches.keys().then(function (keyLists) {
            return Promise.all(keyLists.map(function (key) {
                if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
                    console.log(['Service Worker] removing old cache', key]);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim()
});

self.addEventListener('fetch', function (event) {
    //console.log('[Service Worker] fetching something...', event);
    //event.respondWith(fetch(event.request)); // we could intercept request, but now just passing through here
    event.respondWith(
        // try to find request from cache
        caches.match(event.request)
            .then(function (response) {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then(function (res) {
                        return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
                            cache.put(event.request.url, res.clone());
                            return res;
                        })
                    })
                    .catch(function (err) {

                    });
            })
    )
});