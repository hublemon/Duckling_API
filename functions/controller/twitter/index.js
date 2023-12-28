const express = require("express");
const router = express.Router();

const db = require("../app.js");

const fs = require('fs');
const path = require('path');

const { TwitterApi } = require("twitter-api-v2");
const dotenv = require('dotenv');

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

  async base64ToImage(base64Data, imagePath) {
    const dataBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(imagePath, dataBuffer);
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

      const imageFolder = path.join(__dirname, 'image');
      if (!fs.existsSync(imageFolder)) {
        fs.mkdirSync(imageFolder);
      }

      // Generate a unique filename for the image
      const imageName = `image_${req.params.id}.png`;
      const imagePath = path.join(imageFolder, imageName);

      // Convert base64 to image and save to file
      this.base64ToImage(postImg_url, imagePath);  //첫번째 파라미터 수정
      console.log(imagePath);

      const uploadPath=`./controller/twitter/image/image_${req.params.id}.png`;

      await this.uploadImageAndTweet(userResponse, uploadPath);

      this.deleteImageFile(imagePath);

      res.status(201).json({ message: "Your image tweet is posted successfully" });
    } catch (err) {
      next(err);
    }
  }

  async uploadImageAndTweet(userResponse, imagePath) {
    const client = new TwitterApi({
      appKey: 'U0UxsfyjOlgOQmaKK4XCua7HV',
      appSecret: 'ZhskskETDbWTAmV0Cc9BdRv2wgchENGmpo4zrjfGwMZJyNKbih',
      accessToken: userResponse.access_token,
      accessSecret: userResponse.access_token_secret,
      bearerToken: 'AAAAAAAAAAAAAAAAAAAAAEzBowEAAAAAyi4abGEOQYYwtjoleB1Z%2FwQNiQ8%3DWGoPLOc1C5oaPMenhLzQVeWZ8u1tVwJgRztaUy0hNZIxsxfu3y',
    });
  
    const rwClient = client.readWrite;
  
    try {
      const mediaId = await client.v1.uploadMedia(imagePath);
      await rwClient.v2.tweet({
        media: { media_ids: [mediaId] },
      });
      console.log("Success");
    } catch (e) {
      console.error(e);
      throw { status: 500, message: "이미지 업로드 및 트윗 게시 중에 오류가 발생했습니다." };
    }
  }

  deleteImageFile(imagePath) {
    try {
      fs.unlinkSync(imagePath);
      console.log(`Image file deleted: ${imagePath}`);
    } catch (err) {
      console.error(`Error deleting image file: ${err.message}`);
    }
  }

}

const twitterController = new TwitterController();

module.exports = twitterController;
