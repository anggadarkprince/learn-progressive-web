const CACHE_STATIC_NAME = 'app-static-v8';
const CACHE_DYNAMIC_NAME = 'app-dynamic-v4';
const STATIC_FILES = [
    '/',
    '/index.html',
    '/offline.html',
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
];

function trimCache(cacheName, maxItems) {
    caches.open(cacheName)
        .then(function (cache) {
            return cache.keys()
                .then(function (keys) {
                    if (keys.length > maxItems) {
                        console.log('trim cache');
                        cache.delete(keys[0])
                            .then(trimCache(cacheName, maxItems));
                    }
                })
        })

}

self.addEventListener('install', function (event) {
    console.log('[Service Worker] Installing Service Worker...', event);
    event.waitUntil(caches.open(CACHE_STATIC_NAME).then(function (cache) {
        console.log('[Service Worker] precaching app shell');
        cache.addAll(STATIC_FILES);
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

function isInArray(string, array) {
    var cachePath;
    if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
        console.log('matched ', string);
        cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
    } else {
        cachePath = string; // store the full request (for CDNs)
    }
    return array.indexOf(cachePath) > -1;
}

// Cache then dynamic network strategy
self.addEventListener('fetch', function (event) {
    var url = 'https://httpbin.org/get';
    if (event.request.url.indexOf(url) > -1) {
        event.respondWith(
            caches.open(CACHE_DYNAMIC_NAME)
                .then(function (cache) {
                    return fetch(event.request)
                        .then(function (res) {
                            trimCache(CACHE_DYNAMIC_NAME, 20)
                            cache.put(event.request, res.clone());
                            return res;
                        })
                })
        )
    } else if (isInArray(event.request.url, STATIC_FILES)) {
        event.respondWith(
            caches.match(event.request)
        )
    } else {
        event.respondWith(
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
                            return caches.open(CACHE_STATIC_NAME)
                                .then(function (cache) {
                                    if (event.request.headers.get('accept').includes('text/html')) {
                                        return cache.match('/offline.html');
                                    }
                                })
                        });
                })
        );
    }
});

/*
// Cache with network strategy
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
                        return caches.open(CACHE_STATIC_NAME)
                            .then(function (cache) {
                                return cache.match('/offline.html');
                            })
                    });
            })
    )
});
*/

/* Cache only strategy
self.addEventListener('fetch', function (event) {
    event.respondWith(
        // try to find request from cache
        caches.match(event.request)
    )
});
*/

/* Network only strategy
self.addEventListener('fetch', function (event) {
    event.respondWith(fetch(event.request))
});
*/

/* Network with cache strategy
self.addEventListener('fetch', function (event) {
    event.respondWith(
        fetch(event.request)
            .catch(function (err) {
                // try to find request from cache
                return caches.match(event.request)
            })
    )
});
*/