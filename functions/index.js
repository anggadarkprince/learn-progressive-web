const functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')({origin: true});
var webpush = require('web-push');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

var serviceAccount = require("./pwagram-e5226-firebase-adminsdk-6ocmm-371c5b436b.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://pwagram-e5226.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest((request, response) => {
    cors(request, response, function () {
        admin.database().ref('posts')
            .push({
                id: request.body.id,
                title: request.body.title,
                location: request.body.location,
                image: request.body.image
            })
            .then(function () {
                webpush.setVapidDetails('mailto:anggadarkprince@gmail.com', 'BCDao4vS65_MlYOKwRj4YMjtxC8wOcaTid-8_RPQelH_jnL_-iYbnGCCRvVz3DGZ6hhP6E-PMeTApu7ELYpoIOM', '1fD98WWMJkWtjdDy8qOYHFNxh-x7M11QSRwatUezjWI')
                return admin.database().ref('subscriptions').once('value');
            })
            .then(function (subscriptions) {
                subscriptions.forEach(function (sub) {
                    var pushConfig = {
                        endpoint: sub.val().endpoint,
                        keys: {
                            auth: sub.val().keys.auth,
                            p256dh: sub.val().keys.p256dh
                        }
                    }
                    webpush.sendNotification(pushConfig, JSON.stringify({
                        title: 'New Post',
                        content: 'New Post Added!',
                        openUrl: '/help'
                    }))
                        .catch(function (err) {
                            console.log(err);
                        });
                })
                response.status(201).json({
                    message: 'Data stored',
                    id: request.body.id
                })
            })
            .catch(function (err) {
                response.status(500).json({error: err});
            });
    })
});
