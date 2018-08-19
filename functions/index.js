const functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')({origin: true});
var webpush = require('web-push');
var formidable = require('formidable');
var fs = require('fs');
var UUID = require('uuid-v4');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

var serviceAccount = require("./pwagram-e5226-firebase-adminsdk-6ocmm-371c5b436b.json");

var gcconfig = {
    projectId: 'pwagram-e5226',
    keyFilename: 'pwagram-e5226-firebase-adminsdk-6ocmm-371c5b436b.json'
}

var gcs = require('@google-cloud/storage')(gcconfig);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://pwagram-e5226.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest(function(request, response) {
    cors(request, response, function () {
        var uuid = UUID();
        var formData = new formidable.IncomingForm();
        formData.parse(request, function (err, fields, files) {
            console.log('fields', fields);
            console.log('files', files);
            fs.rename(files.file.path, '/tmp/' + files.file.name);
            var bucket = gcs.bucket('pwagram-e5226.appspot.com');
            bucket.upload('/tmp/' + files.file.name, {
                uploadType: 'media',
                metadata: {
                    metadata: {
                        contentType: files.file.type,
                        firebaseStorageDownloadTokens: uuid
                    }
                }
            }, function (err, file) {
                if (!err) {
                    admin.database().ref('posts')
                    /*.push({
                        id: request.body.id,
                        title: request.body.title,
                        location: request.body.location,
                        image: request.body.image
                    })*/
                        .push({
                            id: fields.id,
                            title: fields.title,
                            location: fields.location,
                            rawLocation: {
                              lat: fields.rawLocationLat,
                              lng: fields.rawLocationLng
                            },
                            image: 'https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(file.name) + '?alt=media&token=' + uuid
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
                                id: fields.id
                            })
                        })
                        .catch(function (err) {
                            response.status(500).json({error: err});
                        });
                } else {
                    console.log(err);
                }
            });
        });
    })
});
