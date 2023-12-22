//const firestorage=require('firebase/storage');
const admin = require("firebase-admin");
const serviceAccount = require("../APIserviceAccount.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

module.exports= db;
//module.exports=firestorage;
