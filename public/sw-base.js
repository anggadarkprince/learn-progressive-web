importScripts("https://storage.googleapis.com/workbox-cdn/releases/3.4.1/workbox-sw.js");
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

workbox.routing.registerRoute(/.*(?:fonts\.gstatic)\.com.*$/, workbox.strategies.staleWhileRevalidate({
    cacheName: 'google-fonts',
    cacheExpiration: {
        maxEntries: 3,
        maxAgeSeconds: 60 * 60 * 24 * 30
    }
}));

workbox.routing.registerRoute('https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.purple-deep_purple.min.css', workbox.strategies.staleWhileRevalidate({
    cacheName: 'material-css'
}));

workbox.routing.registerRoute(/.*(?:firebasestorage\.googleapis)\.com.*$/, workbox.strategies.staleWhileRevalidate({
    cacheName: 'post-images'
}));

workbox.routing.registerRoute('https://pwagram-e5226.firebaseio.com/posts.json', function (args) {
    return fetch(args.event.request)
        .then(function (res) {
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
});

workbox.routing.registerRoute(function (routeData) {
    return routeData.event.request.headers.get('accept').includes('text/html');
}, function (args) {
    return caches.match(args.event.request)
        .then(function (response) {
            if (response) {
                return response;
            }
            return fetch(args.event.request)
                .then(function (res) {
                    return caches.open('dynamic').then(function (cache) {
                        cache.put(args.event.request.url, res.clone());
                        return res;
                    })
                })
                .catch(function (err) {
                    return caches.match('/offline.html')
                        .then(function (cache) {
                            return cache;
                        })
                });
        })
});

workbox.precaching.suppressWarnings();
workbox.precaching.precacheAndRoute([], {});


self.addEventListener('sync', function (event) {
    console.log('[Service Worker] Background syncing', event);
    if (event.tag == 'sync-new-posts') {
        console.log('[Service Worker] Syncing new posts');
        event.waitUntil(
            readAllData('sync-posts')
                .then(function (data) {
                    console.log(data);
                    for (var dt of data) {
                        var postData = new FormData();
                        postData.append('id', dt.id);
                        postData.append('title', dt.title);
                        postData.append('location', dt.location);
                        postData.append('rawLocationLat', dt.rawLocation.lat);
                        postData.append('rawLocationLng', dt.rawLocation.lng);
                        postData.append('file', dt.picture, dt.id + '.png');

                        fetch('https://us-central1-pwagram-e5226.cloudfunctions.net/storePostData', {
                            method: 'POST',
                            body: postData
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
                .catch(function (err) {
                    console.log('error fetch sync-data', err);
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

                    if (client !== undefined) {
                        client.navigate(notification.data.url);
                        client.focus();
                    } else {
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
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});



