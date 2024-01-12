const express = require("express");
const router = express.Router();

const db = require("../app.js");

const fs = require('fs');
const path = require('path');

const { TwitterApi } = require("twitter-api-v2");
const dotenv = require('dotenv');
const { type } = require("os");

dotenv.config();



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

      //base64로 제대로 받으면 되네

      // const readFile = fs.readFileSync(`./controller/twitter/image/icon_blue.png`); //이미지 파일 읽기

      // const encode = Buffer.from(readFile).toString('base64'); //파일 인코딩

      const userResponse = userSnapShot.data();

      await this.uploadImageAndTweet(userResponse, postImg_url);


      res.status(201).json({ message: "Your image tweet is posted successfully" });
    } catch (err) {
      next(err);
    }
  }

  async uploadImageAndTweet(userResponse, postImg_url) {
    const client = new TwitterApi({
      appKey: 'U0UxsfyjOlgOQmaKK4XCua7HV',
      appSecret: 'ZhskskETDbWTAmV0Cc9BdRv2wgchENGmpo4zrjfGwMZJyNKbih',
      accessToken: userResponse.access_token,
      accessSecret: userResponse.access_token_secret,
      bearerToken: 'AAAAAAAAAAAAAAAAAAAAAEzBowEAAAAAyi4abGEOQYYwtjoleB1Z%2FwQNiQ8%3DWGoPLOc1C5oaPMenhLzQVeWZ8u1tVwJgRztaUy0hNZIxsxfu3y',
    });
  
    const rwClient = client.readWrite;
    const base64Data = postImg_url.replace(/^data:image\/jpeg;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
  
    try {
      const mediaId = await client.v1.uploadMedia(buffer, { mimeType: 'image/jpeg' }); 
      await rwClient.v2.tweet({
        media: { media_ids: [mediaId] },
      });
      console.log("Success");
    } catch (e) {
      console.error(e);
      throw { status: 500, message: "이미지 업로드 및 트윗 게시 중에 오류가 발생했습니다." };
    }
  }

}

const twitterController = new TwitterController();

module.exports = twitterController;
