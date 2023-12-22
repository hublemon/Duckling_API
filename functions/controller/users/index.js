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
    
            const resArr = await Promise.all(response.docs.map(async (doc) => {
                const user = doc.data();
                const imageID = user.profileImg;
                
                try {
                    const urlRef = firestorage.ref(store, `users/${user.uid}/${imageID}`);
                    const imageUrl = await firestorage.getDownloadURL(urlRef);
                    user.profileImg = imageUrl;
                } catch (urlError) {
                    console.error("Error fetching image URL:", urlError);
                }
    
                return user;
            }));
    
            res.status(201).json(resArr);
        } catch (err) {
            next(err);
        }
    }

   
    async getUser(req, res, next) {
        try {
            const userRef = db.collection("users").doc(req.params.id);
            const userSnapshot = await userRef.get();
    
            if (!userSnapshot.exists) {
                throw { status: 404, message: "존재하지 않는 유저입니다." };
            }
    
            const userData = userSnapshot.data();
            let imageUrl;
    
            // 프로필 이미지 URL 획득
            const profileID = userData.profileImg;
            try {
                const urlRef = firestorage.ref(store, `users/${userData.uid}/${profileID}`);
                imageUrl = await firestorage.getDownloadURL(urlRef);
            } catch (urlError) {
                console.error("Error fetching image URL:", urlError);
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
            const categories = {
                body: ["top", "bottom", "shoes", "accessory"],
                face: ["eyes", "mouth"],
            };
    
            const assets = {};
    
            for (const [category, categoryItems] of Object.entries(categories)) {
                const categoryRef = db.collection("assets").doc(category);
    
                for (const item of categoryItems) {   //if밖으로 못 나오면 if 안에서 다 처리해라
                    if (userAvatar.hasOwnProperty(item)) {
                        const categoryKindRef = categoryRef.collection(item).doc(userAvatar[item]);
                        const categorySnapshot = await categoryKindRef.get();
    
                        assets[item] = {
                            assetID: categorySnapshot.get("assetID"),
                            assetGltf: categorySnapshot.get("assetGltf"),
                            assetImg: categorySnapshot.get("assetImg"),
                        };
                    }
                }
            }
    
            res.status(200).json(assets);
        } catch (err) {
            next(err);
        }
    }

    async putUser(req, res, next) {
        try {
            const { uid, profileImg, userName,access_token,access_token_secret } = req.body;
    
            if (!uid || !profileImg || !userName || !access_token || !access_token_secret ) {
                throw { status: 400, message: "유저 정보가 부족합니다." }; 
            }

            const userDocRef = db.collection("users").doc(uid);
            const userDoc = await userDocRef.get();

            let userAvatar = {};

            if (userDoc.exists) {
                userAvatar = userDoc.data().collection("userAvatar");
            }
            //추가된 부분//
            const metadata = {
                contentType: 'image/jpg',
            };

            const profileID=uuidRandom();
            const imgRef = firestorage.ref(store, `users/${uid}/${profileID}`);
            
            const base64Img = profileImg.replace(/-/g, '+').replace(/_/g, '/');
            const base64DecodedImg = Buffer.from(base64Img, 'base64').toString('base64');

            // Firebase Storage에 업로드
            await firestorage.uploadString(imgRef, base64DecodedImg, 'base64', metadata);
            // const imageUrl = await firestorage.getDownloadURL(imgRef);
            //여기까지//
            const userJson = {
                uid:uid,
                profileImg: profileID,
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
    
    async updateUser(req,res,next){
        try{
            const {userName,profileImg ,userAvatar}=req.body;
            const userRef=db.collection("users").doc(req.params.id);
            const userSnapshot=await userRef.get();
            if(!userSnapshot.exists){
                throw {status: 404, message: "존재하지 않는 유저입니다."};
            }
            const resData = userSnapshot.data();

            const oldImageID = resData.profileImg;
            const oldImageUrlRef = firestorage.ref(store, `users/${req.params.id}/${oldImageID}`);
            const newImageID = profileImg ? uuidRandom() : oldImageID;

            // 이미지 삭제 및 업로드 병렬 처리
            await Promise.all([
                oldImageID ? firestorage.deleteObject(oldImageUrlRef) : Promise.resolve(),
                profileImg ? firestorage.uploadString(firestorage.ref(store, `users/${req.params.id}/${newImageID}`), profileImg, 'data_url', { contentType: 'image/jpg' }) : Promise.resolve()
            ]);

            await userRef.update({
                profileImg: newImageID,
                userName: userName || resData.userName,
                userAvatar: userAvatar || resData.userAvatar
            });

            const modifiedUserSnapshot = await userRef.get();
            const modifiedUser = modifiedUserSnapshot.data();
            res.status(204).json(modifiedUser); //원래는 204했는데 이러면 json 응답 안 뜸
        } catch(err){
            next(err);
        }
    }
    

    async deleteUser(req,res,next){
        try{
            const userRef=db.collection("users").doc(req.params.id);
            const userSnapshot= await userRef.get();
            if(!userSnapshot.exists){
                throw {status: 404, message: "존재하지 않는 유저입니다."};
            }
            await db.collection("users").doc(req.params.id).delete();
            res.status(204).json({ message:"유저 정보가 삭제되었습니다." });
        } catch(err){
            next(err);
        }
    }
}

const userController=new UserController();

module.exports= userController;