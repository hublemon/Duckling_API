//Solution_1
// const express = require("express");
// const router = express.Router();

// const db = require("../app.js");

// const axios = require('axios'); 
// const crypto=require('crypto');
// const dotenv=require('dotenv');
// const FormData =require('form-data'); 
// const { v4 }= require('uuid');

// class TwitterController {

//   router;
//   path = "/twitter";

//   constructor() {
//     this.router = router;
//     this.init();
//   }

//   init() {
//     this.router.post("/:id", this.putTwitter.bind(this));
//   }

//   imageToBinary = async (url) => {
//     const res = await axios.get(url, {
//       responseType: 'arraybuffer',
//     });
  
//     return Buffer.from(res.data, 'binary').toString('base64');
//   };

//   encodeValue = async (text) => {
//     const encodedText = encodeURIComponent(text)
//       .replace(/[_!'()*]/g, match => `%${match.charCodeAt(0).toString(16).toUpperCase()}`);
//     return encodedText;
//   };
  

//   async putTwitter(req, res, next) {
//     try {
//       const { postImg_url, text } = req.body;

//       if (!text || !postImg_url) {
//         throw { status: 400, message: "트위터 게시글 정보가 부족합니다." };
//       }

//       const userRef = db.collection("users").doc(req.params.id);
//       const userSnapShot = await userRef.get();

//       if (!userSnapShot.exists) {
//         throw { status: 404, message: "존재하지 않는 사용자입니다." };
//       }

//       const userResponse = userSnapShot.data();

//       dotenv.config();
//       const ouath_consumer_key=process.env.TWITTER_CONSUMER_KEY;
//       const oauth_nonce = v4();
//       const oauth_signature_method='HMAC-SHA1';
//       // const oauth_timestamp = Math.floor(+new Date() / 1000);
//       const oauth_timestamp = Math.floor(Date.now() / 1000);
//       const oauth_version='1.0';
//       const oauth_token=userResponse.access_token;

//       const parameters = {
//         ouath_consumer_key,
//         oauth_nonce,
//         oauth_signature_method,
//         oauth_timestamp,
//         oauth_version,
//         oauth_token,
//       };

//       const ordered = Object.keys(parameters)
//       .sort()
//       .reduce((acc, key) => {
//         acc[key] = parameters[key];
//         return acc;
//       }, {});
//       //key 알파벳 순으로 정렬한다

//       let encodedParameters = '';

//       for (let key in ordered) {
//         const encodedValue = this.encodeValue(ordered[key]);
//         const encodedKey = encodeURIComponent(key);
//         if (encodedParameters === '') {
//           encodedParameters += `${encodedKey}=${encodedValue}`;
//         } else {
//           encodedParameters += `&${encodedKey}=${encodedValue}`;
//         }
//       }

//       const method = 'POST';
//       const url = 'https://api.twitter.com/2/tweets';
//       const encodedUrl = encodeURIComponent(url);
//       encodedParameters = encodeURIComponent(encodedParameters);

//       //base string으로 합치기
//       const signature_base_string = `${method}&${encodedUrl}&${encodedParameters}`;
//       const signing_key = `${encodeURIComponent(process.env.TWITTER_CONSUMER_SECRET)}&${encodeURIComponent(userResponse.access_token_secret)}`;

//       const oauth_signature = crypto.createHmac('sha1', signing_key).update(signature_base_string).digest('base64');

//       const encoded_oauth_signature = encodeURIComponent(oauth_signature);

//       const header = `OAuth oauth_consumer_key="${parameters.oauth_consumer_key}",oauth_token="${parameters.oauth_token}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="${parameters.oauth_timestamp}",oauth_nonce="${parameters.oauth_nonce}",oauth_version="1.0",oauth_signature="${encoded_oauth_signature}"`;

//       const Imgdata=this.imageToBinary(postImg_url);
//       const formData = new FormData( ['media_data', Imgdata]);
      
//       const tweetResult = await axios(
//         {
//           url,
//           method,
//           text: text,
//           Imgdata,
//           headers: {
//             Authorization: header,
//             'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
//             // 'Content-Type': multipart/form-data
//           },
//         }); 
      

//       res.status(201).json(tweetResult);
//     } catch (err) {
//       next(err);
//     }
//   }
// }

// const twitterController = new TwitterController();

// module.exports = twitterController;

