/*
const express = require("express");
const cors=require("cors");
const helmet=require("helmet");
const functions=require("firebase-functions");
// const {onRequest} = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");
const controllers=require("./controller/index.js");
const app = express();
app.use(express.json());
//app.use(express.urlencoded({extended: true}));

const corsOptions = {
  origin: "https://netural-app.firebaseapp.com/", // 허용할 도메인
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // 인증 정보를 서버로 전송할 경우 true로 설정
  optionsSuccessStatus: 204, // Preflight 요청(옵션 메서드)에 대한 응답 상태 코드
};

app.use(cors(corsOptions));
app.use(helmet());

// Content Security Policy (CSP) 설정
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "trusted-scripts.com"],
      styleSrc: ["'self'", "trusted-styles.com"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: true,
    },
  })
);

// Referrer-Policy 설정
app.use(helmet.referrerPolicy({ policy: "same-origin" }));

// Feature-Policy 설정 (원하는 기능 정책을 추가)
app.use(
  helmet.featurePolicy({
    features: {
      geolocation: ["'none'"],
      fullscreen: ["'self'"],
    },
  })
);

app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({limit: '100mb', extended: true}));

const bodyParser = require('body-parser'); 
app.use(bodyParser.json({limit: 5000000}));

controllers.forEach((controller)=>{
  app.use(controller.path, controller.router);
});

app.use((err, req, res, next)=>{
  res.status(err.status||500).json({message: err.message||"서버 오류가 발생했습니다"});
});

/*
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});  
*/

//exports.api=functions.https.onRequest(app);


const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const functions = require("firebase-functions");
const bodyParser = require('body-parser');
const controllers = require("./controller/index.js");

const app = express();

const corsOptions = {
  //origin: ["https://netural-app.firebaseapp.com",""],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(express.json());
app.use(cors(corsOptions));
//app.use(helmet());
//app.use(helmet.referrerPolicy({ policy: "same-origin" }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json({ limit: 5000000 }));

controllers.forEach((controller) => {
  app.use(controller.path, controller.router);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message || "서버 오류가 발생했습니다" });
});


const PORT = 8080; //process.env.PORT
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
}); 

// exports.api = functions.https.onRequest(app);

