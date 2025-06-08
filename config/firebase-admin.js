const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../config/firebase-admin.json'));


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://server-minifood.firebaseio.com'
});

module.exports = admin;