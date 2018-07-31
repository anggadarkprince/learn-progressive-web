importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const CACHE_STATIC_NAME = 'app-static-v5';
const CACHE_DYNAMIC_NAME = 'app-dynamic-v4';
const STATIC_FILES = [
    '/',
    '/index.html',
    '/offline.html',
    '/src/js/app.js',
    '/src/js/feed.js',
    '/src/js/idb.js',
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

var url = 'https://pwagram-e5226.firebaseio.com/posts.json';

// Cache then dynamic network strategy
self.addEventListener('fetch', function (event) {
    if (event.request.url.indexOf(url) > -1) {
        event.respondWith(
            fetch(event.request)
                .then(function (res) {
                    //trimCache(CACHE_DYNAMIC_NAME, 20)
                    //cache.put(event.request, res.clone());
                    var clonedRes = res.clone();
                    clearAllData('posts')
                        .then(function () {
                            return clonedRes.json();
                        })
                        .then(function (data) {
                            for (var key in data) {
                                writeData('posts', data[key]);
                            }
                        });
                    return res;
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


self.addEventListener('sync', function (event) {
    console.log('[Service Worker] Background syncing', event);
    if (event.tag == 'sync-new-posts') {
        console.log('[Service Worker] Syncing new posts');
        event.waitUntil(
            readAllData('sync-posts')
                .then(function (data) {
                    for (var dt of data) {
                        fetch('https://us-central1-pwagram-e5226.cloudfunctions.net/storePostData', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                id: dt.id,
                                title: dt.title,
                                location: dt.location,
                                image: "https://firebasestorage.googleapis.com/v0/b/pwagram-e5226.appspot.com/o/21310226281_c2d8226841_k.jpg?alt=media&token=51c9d8c5-9514-45fd-bdfe-eeaf51da9386"
                            })
                        })
                            .then(function (res) {
                                console.log('Send data', res);
                                if (res.ok) {
                                    res.json()
                                        .then(function (resData) {
                                            deleteItemFromData('sync-posts', resData.id);
                                        });
                                }
                            })
                            .catch(function (err) {
                                console.log('Error while sending data', err);
                            });
                    }
                })
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    var notification = event.notification;
    var action = event.action;

    console.log(notification);

    if (action === 'confirm') {
        console.log('Confirm was chosen');
        notification.close();
    } else {
        console.log(action);
        event.waitUntil(
            clients.matchAll()
                .then(function (clis) {
                    var client = clis.find(function (c) {
                        return c.visibilityState === 'visible';
                    });

                    if (client !== undefined){
                        client.navigate(notification.data.url);
                        client.focus();
                    }  else {
                        clients.openWindow(notification.data.url);
                    }
                    notification.close();
                })
        );
    }
});

self.addEventListener('notificationclose', function (event) {
    console.log('Notification was closed', event);
});

self.addEventListener('push', function (event) {
    console.log('Push notification received', event);
    var data = {title: 'New', content: 'Something new happened!', openUrl: '/'};
    if (event.data) {
        data = JSON.parse(event.data.text());
    }
    var options = {
        body: data.content,
        icon: '/src/images/app-icon-96x96.png',
        badge: '/src/images/app-icon-96x96.png',
        data: {
            url: data.openUrl
        }
    }
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
})