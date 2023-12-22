const express = require("express");
const router = express.Router();

const db = require("../app.js");

const request = require('request');
const FormData = require('form-data');

class TwitterController {

  router;
  path = "/twitter";

  constructor() {
    this.router = router;
    this.init();
  }

  init() {
    this.router.post("/:id", this.putTwitter.bind(this));
  }

  requestCallback(err, res, body) {
    if (err) {
      console.error(err);
      throw err;
    } else {
      console.log("Tweet and Image uploaded successfully!");
      console.log(body); // 트위터 API 응답 출력
    }
  }

  async putTwitter(req, res, next) {
    try {
      const { postImg_url } = req.body;

      if (!postImg_url) {
        throw { status: 400, message: "트위터 게시글 정보가 부족합니다." };
      }

      const userRef = db.collection("users").doc(req.params.id);
      const userSnapShot = await userRef.get();

      if (!userSnapShot.exists) {
        throw { status: 404, message: "존재하지 않는 사용자입니다." };
      }

      const userResponse = userSnapShot.data();

      const form = new FormData();
      form.append('media[]', postImg_url);

      // 변경: requestCallback을 클래스 메서드로 전달합니다.
      form.getLength((err, length) => {
        if (err) {
          console.error(err); // 에러 메시지 출력
          next(err); // 에러를 다음 미들웨어로 전달
        } else {
          const oauth = {
            oauth_consumer_key: process.env.TWITTER_CONSUMER_KEY,
            oauth_consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
            oauth_token: userResponse.access_token_key,
            oauth_token_secret: userResponse.access_token_secret
          };

          // 변경: request.post 내에서 this.requestCallback을 전달합니다.
          let r = request.post({
            url: "https://api.twitter.com/1.1/statuses/update_with_media.json",
            oauth: oauth,
            host: "api.twitter.com",
            protocol: "https:"
          }, this.requestCallback);

          r._form = form;
          r.setHeader('content-length', length);
        }
      });

      res.status(201).json({ message: "Tweet and Image upload in progress..." });
    } catch (err) {
      next(err);
    }
  }
}

const twitterController = new TwitterController();

module.exports = twitterController;
