var deferredPrompt;
var enableNotificationButtons = document.querySelectorAll('.enable-notifications');

if (!window.Promise) {
    window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/sw.js')
        .then(function () {
            console.log('Service worker registered!')
        })
        .catch(function (err) {
            //console.log(err);
        });
}

// install banner add to home screen
window.addEventListener('beforeinstallprompt', function (event) {
    console.log('beforeinstallprompt fired');
    event.preventDefault();
    deferredPrompt = event;
    return false;
});

function displayConfirmNotification() {
    var title = 'Successfully subscribed!';
    var options = {
        body: 'You successfully subscribe to out Notification service!',
        icon: '/src/images/icons/app-icon-96x96.png',
        image: '/src/images/main-image.jpg',
        dir: 'ltr',
        lang: 'en-US', // BCP 47
        vibrate: [100, 50, 200], // vibration, pause, vibration in millis
        badge: '/src/images/icons/app-icon-96x96.png',
        tag: 'confirm-notification',
        renotify: true,
        actions: [
            {
                action: 'confirm',
                title: 'Okay',
                icon: '/src/images/icons/app-icon-96x96.png',
            },
            {
                action: 'cancel',
                title: 'Cancel',
                icon: '/src/images/icons/app-icon-96x96.png',
            }
        ]
    }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then(function (swreg) {
                swreg.showNotification(title, options);
            })
    } else {
        new Notification(title, options);
    }
}

function configurePushSubscription() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    var reg;
    navigator.serviceWorker.ready
        .then(function (swreg) {
            reg = swreg;
            return swreg.pushManager.getSubscription();
        })
        .then(function (subscription) {
            if(subscription === null) {
                // create new subscription
                var vapidPublicKey = 'BCDao4vS65_MlYOKwRj4YMjtxC8wOcaTid-8_RPQelH_jnL_-iYbnGCCRvVz3DGZ6hhP6E-PMeTApu7ELYpoIOM';
                var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
                return reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidPublicKey
                });
            } else {
                // we have a subscription
            }
        })
        .then(function (newSub) {
            return fetch('https://pwagram-e5226.firebaseio.com/subscriptions.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(newSub)
            });
        })
        .then(function (res) {
            if(res.ok) {
                displayConfirmNotification();
            }
        })
        .catch(function (err) {
            console.log(err);
        });
}

function askForNotificationPermission() {
    Notification.requestPermission(function (result) {
        console.log('User choice', result);
        if (result !== 'granted') {
            console.log('No notification permission granted');
        } else {
            configurePushSubscription();
            //displayConfirmNotification();
        }
    });
}

if ('Notification' in window) {
    console.log(enableNotificationButtons);
    for (var i = 0; i < enableNotificationButtons.length; i++) {
        enableNotificationButtons[i].style.display = 'inline-block';
        enableNotificationButtons[i].addEventListener('click', askForNotificationPermission);
    }
} else {
    console.log('Not support notification');
}

/*
var promise = new Promise(function (resolve, reject) {
    setTimeout(function () {
        //resolve('This is executed once the timer is done!');
        //reject({code: 500, message: 'an error occurred'})
        //console.log('This is executed once the timer is done!');
    }, 3000);
});


var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://httpbin.org/ip');
xhr.responseType = 'json';
xhr.onload = function() {
    console.log(xhr.response);
}
xhr.onerror = function() {
    console.log('Error!');
}
xhr.send();

fetch('https://httpbin.org/ip')
    .then(function(response){
        console.log(response);
        return response.json();
    })
    .then(function (data) {
        console.log(data);
    })
    .catch(function (err) {
        console.log(err);
    });

fetch('https://httpbin.org/post', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    //mode: 'no-cors', hidden data, but we could  access to html etc image file
    body: JSON.stringify({
        name: 'Angga Ari Wijaya',
        message: 'Does this work?'
    })
})
    .then(function(response){
        console.log(response);
        return response.json();
    })
    .then(function (data) {
        console.log(data);
    })
    .catch(function (err) {
        console.log(err);
    });

promise.then(function (text) {
    return text;
}, function (error) {
    console.log(error);
}).then(function (newText) {
    console.log(newText);
});

promise.then(function (text) {
    return text;
}).then(function (newText) {
    console.log(newText);
}).catch(function (error) {
    console.log(error);
});
*/