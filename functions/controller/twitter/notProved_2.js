//Solution_2
// const express = require("express");
// const router = express.Router();

// const db = require("../app.js");

// const twitter = require('twitter-lite');

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

//       const apiClient = new twitter({
//         subdomain: 'api',
//         consumer_key: process.env.TWITTER_CONSUMER_KEY,
//         consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
//         access_token_key: userResponse.access_token_key,
//         access_token_secret: userResponse.access_token_secret,
//       });

//       const uploadClient = new twitter({
//         subdomain: 'upload',
//         consumer_key: process.env.TWITTER_CONSUMER_KEY,
//         consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
//         access_token_key: userResponse.access_token_key,
//         access_token_secret: userResponse.access_token_secret,
//       });

//       let media_id;

//       uploadClient
//         .post('media/upload', { media_data: postImg_url })
//         .then((media) => {
//           console.log('미디어 업로드 성공:', media);

//           media_id = media.media_id_string;
//           return apiClient.post('statuses/update', {
//             status: text,
//             media_ids: media_id,
//           });
//         })
//         .then((tweet) => {
//           console.log('트윗 성공적으로 게시됨:', tweet);
//         })
//         .catch((error) => {
//           console.error('트윗 게시 중 오류:', error);
//         })
//         .finally(() => {
//           res.status(201).json({ media_ids: media_id });
//         });
//     } catch (err) {
//       next(err);
//     }
//   }
// }

// const twitterController = new TwitterController();

// module.exports = twitterController;