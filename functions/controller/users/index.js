const express = require("express");
const router = express.Router();

const db=require("../app.js");
const firestorage=require("../../config.js");
const store= firestorage.getStorage();

const uuidRandom = require('uuid-random');
const { storage } = require("firebase-admin");
const { user } = require("firebase-functions/v1/auth");


class UserController{
    router
    path="/users"
    users = [{
        uid: "loginUID",
        //userID : "userID",
        profileImg: "photoURL",
        userName: "userName",
        access_token:"",
        access_token_secret:"",
        userAvatar: {
            
        }
    }]

    constructor(){
        this.router=router;
        this.init();
        //console.log("No errer");
    }

    init(){
        this.router.get("/",this.getUsers.bind(this));
        this.router.get("/:id",this.getUser.bind(this));
        this.router.get("/avatar/:id",this.getUserAvatar.bind(this));
        this.router.post("/",this.putUser.bind(this));
        this.router.patch("/:id",this.updateUser.bind(this));
        this.router.delete("/:id",this.deleteUser.bind(this));
    }


    async getUsers(req, res, next) {
        try {
            const userRef = db.collection("users");
            const response = await userRef.get();
    
            const promises = response.docs.map(doc => doc.data());
            const users = await Promise.all(promises);
    
            res.status(201).json(users);
        } catch (err) {
            next(err);
        }
    }
    
   
    async getUser(req, res, next) {
        try {
            const userRef = db.collection("users").doc(req.params.id);
            const userSnapshot = await userRef.get();

            let imageUrl;
            let userData={};
    
            if (!userSnapshot.exists) {
                try {
                    // Firebase Storage 참조 생성
                    const imgRef = firestorage.ref(store, `users/${req.params.id}`);
                    if(imgRef){
                        imageUrl=await this.getBasicImageURL();
                    }
                } catch (error) {
                    console.error("이미지 URL을 가져오는 중 에러 발생:", error);
                    throw { status: 404, message: "존재하지 않는 유저입니다." };
                }
            } else{
                userData = userSnapshot.data();
                imageUrl= userData.profileImg;
                // 프로필 이미지 URL 획득
                // const profileID = userData.profileImg;
                // try {
                //     const urlRef = firestorage.ref(store, `users/${userData.uid}/${profileID}`);
                //     imageUrl = await firestorage.getDownloadURL(urlRef);
                // } catch (urlError) {
                //     console.error("Error fetching image URL:", urlError);
                // }
            }

    
            // 응답 데이터에 이미지 URL 추가
            const response = {
                ...userData,
                profileImg: imageUrl || null, // 이미지 URL이 없을 경우 null 설정
            };
    
            res.status(200).json(response);
        } catch (err) {
            next(err);
        }
    }


    async getUserAvatar(req, res, next) {  //스스로 구현해냈다!
        try {
            const userId = req.params.id;
            const userRef = db.collection("users").doc(userId);
            const userSnapshot = await userRef.get();
    
            if (!userSnapshot.exists) {
                throw { status: 404, message: "존재하지 않는 유저입니다." };
            }
    
            const userAvatar = userSnapshot.get("userAvatar");
            console.log(userAvatar);
    
            res.status(200).json(userAvatar);
        } catch (err) {
            next(err);
        }
    }

    async putUser(req, res, next) {
        try {
            const { uid, userName,access_token,access_token_secret } = req.body;
    
            if (!uid || !userName || !access_token || !access_token_secret ) {
                throw { status: 400, message: "유저 정보가 부족합니다." }; 
            }

            const userDocRef = db.collection("users").doc(uid);
            const userDoc = await userDocRef.get();

            let userAvatar = {};
            let profileImg;
            let profileID;

            [profileID, profileImg] = await Promise.all([
            uuidRandom(),
            this.getBasicImageURL() // 프로필 이미지 URL을 가져오는 비동기 함수
            ]);
            if (userDoc.exists) {
                userAvatar = userDoc.data().userAvatar;
                profileImg=userDoc.data().profileImg;
            }

            const imgRef = firestorage.ref(store, `users/${uid}/${profileID}`);
            
            //여기까지//
            const userJson = {
                uid:uid,
                profileImg: profileImg,
                userName: userName,
                userAvatar: userAvatar,
                access_token: access_token,
                access_token_secret: access_token_secret
            };
    
            await userDocRef.set(userJson, { merge: true }); 
            res.status(201).json(userJson);
        } catch (err) {
            next(err);
        }
    }

    async updateUser(req, res, next) {
        try {
            const { userName, profileImg, userAvatar } = req.body;
            const userRef = db.collection("users").doc(req.params.id);
            const userSnapshot = await userRef.get();
    
            if (!userSnapshot.exists) {
                throw { status: 404, message: "존재하지 않는 유저입니다." };
            }
    
            const resData = userSnapshot.data();
            const oldImageID = resData.profileImg;
            const newImageID = profileImg ? uuidRandom() : oldImageID;
            let imageURL;
    
            if (profileImg) {
                // 이미지 삭제
                await this.deleteImages(`users/${req.params.id}}`);
                // 새로운 이미지 업로드
                await firestorage.uploadString(
                    firestorage.ref(store, `users/${req.params.id}/${newImageID}`),
                    profileImg,
                    'data_url',
                    { contentType: 'image/jpg' }
                );
                const imgRef=await firestorage.ref(store, `users/${req.params.id}/${newImageID}`);
                imageURL = await firestorage.getDownloadURL(imgRef);
            }

            await userRef.update({
                profileImg: imageURL||resData.profileImg,
                userName: userName || resData.userName,
                userAvatar: userAvatar || resData.userAvatar
            });
            
            const modifiedUserSnapshot = await userRef.get();
            const modifiedUser = modifiedUserSnapshot.data();
            res.status(204).json(modifiedUser);
        } catch (err) {
            next(err);
        }
    }
    

    async deleteUser(req, res, next) {
        try {
            const userId = req.params.id;
            const userRef = db.collection("users").doc(userId);
            const userSnapshot = await userRef.get();
    
            if (!userSnapshot.exists) {
                throw { status: 404, message: "존재하지 않는 유저입니다." };
            }
    
            // 이미지 삭제
            await this.deleteImages(`users/${userId}`);
    
            // 유저 삭제
            await userRef.delete();
    
            res.status(204).json({ message: "유저 정보가 삭제되었습니다." });
        } catch (err) {
            console.error("에러 발생:", err);
            next(err);
        }
    }
    
    async getBasicImageURL() {
        try {
            const listRef = firestorage.ref(store, `users/Basic`);
            const listResult = await firestorage.listAll(listRef);
            const items = listResult.items;
            // console.log(items[0].fullPath);
    
            if (items.length > 0) {
                const randomIndex = Math.floor(Math.random() * (items.length-1));
                return await firestorage.getDownloadURL(items[randomIndex]);
                //https://firebasestorage... 이 꼴임
            } else {
                throw { status: 404, message: "존재하지 않는 프로필 이미지입니다." };
            }
        } catch (error) {
            console.error("이미지 URL을 가져오는 중 에러 발생:", error);
        }
    }

    async deleteImages(path) {
        try {
            const listRef = firestorage.ref(store, path);
            const listResult = await firestorage.listAll(listRef);
            const items = listResult.items;
    
            if (items.length > 0) {
                await Promise.all(items.map(async (item) => {
                    await firestorage.deleteObject(item);
                }));
            } else {
                throw { status: 404, message: "존재하지 않는 프로필 이미지입니다." };
            }
        } catch (error) {
            console.error("이미지 삭제 중 에러 발생:", error);
        }
    }
    
}

const userController=new UserController();

module.exports= userController;