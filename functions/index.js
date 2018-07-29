const functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')({origin: true});

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
                response.status(200).json({
                    message: 'Data stored',
                    id: request.body.id
                })
            })
            .catch(function (err) {
                response.status(500).json({error: err});
            });
    })
});
