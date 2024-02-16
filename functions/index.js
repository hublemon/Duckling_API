const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const functions = require("firebase-functions");
const bodyParser = require('body-parser');
const controllers = require("./controller/index.js");
const { apiLimiter } = require("./controller/middlewares.js");

const app = express();

const corsOptions = {
  // origin: ["https://netural-app.firebaseapp.com"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};


// app.use(apiLimiter);
app.use(express.json());
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json({ limit: 5000000 }));

controllers.forEach((controller) => {
  app.use(controller.path,controller.router);
  // app.use(controller.path,controller.router,apiLimiter);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message || "서버 오류가 발생했습니다" });
});


// const PORT = 8080; //process.env.PORT
// app.listen(PORT, () => {
//   console.log(`Server is running on ${PORT}`);
// }); 

exports.api = functions.https.onRequest(app);


