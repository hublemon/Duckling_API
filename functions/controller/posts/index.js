const express = require("express");
const router = express.Router();

const db=require("../app.js");
const firestorage=require("../../config.js");
const store= firestorage.getStorage();

const uuidRandom = require('uuid-random');
const { storage } = require("firebase-admin");
const { user } = require("firebase-functions/v1/auth");

class PostController{
    router
    path="/posts"
    posts = [{
        postID: "postID",
        title: "title",
        body: "body",
        postImg: "postImg",
        writerID: "uid",
        writerName: "name",
        time: "time",
        date: "date",
        likes: "likes",
        commentCount:""
    }]

    constructor(){
        this.router=router;
        this.init();
        //console.log("No errer");
    }

    init(){
        // this.router.get("/",this.getPostsByTime.bind(this));
        // this.router.get("/",this.getPostsByLikes.bind(this));
        this.router.get("/", (req, res) => {
            const sortBy = req.query.sortBy; // `${apiEndpoint}/?sortBy=${sortBy}`
    
            if (sortBy === "time") {
                this.getPostsByTime(req, res);
            } else if (sortBy === "likes") {
                this.getPostsByLikes(req, res);
            } else {
                // 기본적으로는 시간을 기준으로 가져오도록 설정
                this.getPostsByTime(req, res);
            }
        });
        this.router.get("/:postID",this.getPost.bind(this));
        this.router.get("/writer/:writerID",this.getUserPosts.bind(this));
        // this.router.get("/writer/:writerID/:postID",this.getUserPost.bind(this));
        this.router.post("/",this.putPost.bind(this));
        this.router.patch("/likes/:postID/:userID",this.updateLikes.bind(this)); //likes 추가로 만들지 아니면 누적을 받을지
        this.router.delete("/:postID",this.deletePost.bind(this));
    }

    //비동기는 전설이다..
    async getPosts(req, res, next, sortKey) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const start = parseInt(req.query.start) || 0;
    
            const postsRef = db.collection("posts");
            const response = await postsRef.get();
    
            const resArr = response.docs.map(doc => doc.data());
    
            resArr.sort((a, b) => b[sortKey] - a[sortKey] || (sortKey === 'time' ? b.likes - a.likes : b.time - a.time));
    
            const paginatedPosts = resArr.slice(start, start + limit);
    
            res.status(201).json(paginatedPosts);
        } catch (err) {
            next(err);
        }
    }
    
    
    async getPostsByTime(req, res, next) {
        await this.getPosts(req, res, next, 'time');
    }
    
    async getPostsByLikes(req, res, next) {
        await this.getPosts(req, res, next, 'likes');
    }
    
    
    async getPost(req,res,next){  //구현 완료
        try{
            const postRef=db.collection("posts").doc(req.params.postID);
            const postSnapShot=await postRef.get();
            if(!postSnapShot.exists){
                throw {status: 404, message: "존재하지 않는 게시글입니다."};
            }
            const response= postSnapShot;
            const post = response.data();
            
            res.status(200).json(post);
        } catch(err){
            next(err);
        }
    }

    
    async getUserPosts(req, res, next) {
        try {
            const postsRef = db.collection("posts");
            const response = await postsRef.orderBy('time', 'desc').get();
    
            const resArr = response.docs.map(doc => doc.data());
    
            res.status(200).json(resArr);
        } catch (err) {
            next(err);
        }
    }
    


    formatDateToYYYYMMDD(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}.${month}.${day}`;
    }


    async putPost(req, res, next) {
        try {
            const { title, body, postImg, writerID, writerName } = req.body;
    
            if (!title || !body || !writerID || !writerName) {
                throw { status: 400, message: "게시글 정보가 부족합니다." };
            }
    
            const postID = uuidRandom();
            const imgIDArr = [];
            const imgURLArr = [];
            let delay = 0;
    
            const uploadPromises = Object.entries(postImg).map(async ([key, image]) => {
                const imageID = uuidRandom();
                imgIDArr.push(imageID);
    
                const imgRef = firestorage.ref(store, `posts/${writerID}/${postID}/${imageID}`);
                
                // setTimeout을 이용한 딜레이 추가
                await new Promise(resolve => setTimeout(resolve, delay));
                await firestorage.uploadString(imgRef, image, 'data_url', { content: 'image/jpg' });
    
                const url = await firestorage.getDownloadURL(imgRef);
                imgURLArr.push(url);
    
                // 1초씩 딜레이 증가
                delay += 1000;
            });
    
            await Promise.all(uploadPromises);
    
            const date = new Date();
            const postJson = {
                postID,
                title,
                body,
                writerID,
                writerName,
                likes: [],
                commentCount: 0,
                postImg: imgURLArr,
                time: date.getTime(),
                date: this.formatDateToYYYYMMDD(date),
            };
    
            await db.collection("posts").doc(postID).set(postJson);
            res.status(201).json(postJson);
        } catch (err) {
            next(err);
        }
    }
    

    async updateLikes(req, res, next) {
    try {
        const postRef = db.collection("posts").doc(req.params.postID);
        const postSnapshot = await postRef.get();

        if (!postSnapshot.exists) {
            throw { status: 404, message: "존재하지 않는 게시글입니다." };
        }

        const postData = postSnapshot.data();
        const currentLikes = postData.likes || [];

        // req.params.userID가 이미 likes 배열에 있는지 확인
        const userIndex = currentLikes.indexOf(req.params.userID);

        if (userIndex !== -1) {
            // 이미 좋아요를 누른 경우, 제거
            currentLikes.splice(userIndex, 1);
        } else {
            // 좋아요를 누르지 않은 경우, 추가
            currentLikes.push(req.params.userID);
        }
        const updatedLikes = currentLikes.length;

        await db.collection("posts").doc(req.params.postID).update({
            likes: currentLikes
        });

        res.status(204).json({ likes: updatedLikes });
        } catch (err) {
            next(err);
        }
    }

    async deletePost(req, res, next) {
        try {
            const postRef = db.collection("posts").doc(req.params.postID);
            const postSnapshot = await postRef.get();
    
            if (!postSnapshot.exists) {
                throw { status: 404, message: "존재하지 않는 게시글입니다." };
            }
    
            // delete 메서드를 직접 호출하여 문서를 삭제합니다.
            await postRef.delete();
    
            res.status(201).json({ message: "게시글이 삭제되었습니다." });  // 원래는 204를 보내야하지만..
        } catch (err) {
            next(err);
        }
    }
    
}

const postController=new PostController();

module.exports= postController;