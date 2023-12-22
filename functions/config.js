const App=require("firebase/app");
const firestorage=require('firebase/storage');

const firebaseConfig = {
  apiKey: "AIzaSyDNyQ4MoZz2uTchwXQyxKL8ObjG9ZLd4RY",
  authDomain: "netural-app.firebaseapp.com",
  projectId: "netural-app",
  storageBucket: "netural-app.appspot.com",
  messagingSenderId: "5750692533",
  appId: "1:5750692533:web:5a5f2c7e706cd20cd7bcfc"
};

// Initialize Firebase
const app = App.initializeApp(firebaseConfig);
const store= firestorage.getStorage();


module.exports=firestorage;