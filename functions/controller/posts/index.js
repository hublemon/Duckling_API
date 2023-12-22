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
    async getPostsByTime(req, res, next) {
        try {

            const limit = parseInt(req.query.limit) || 10; //http://localhost:8080/posts?limit=5&start=5
            const start = parseInt(req.query.start) || 0; 

            const postsRef = db.collection("posts");
            const response = await postsRef.get();
            const resArr = [];
    
            const downloadUrlPromises = [];
    
            for (const doc of response.docs) {
                const post = doc.data();
                const images = post.postImg;
    
                const imageUrlsPromise = images.map(async (image) => {
                    const urlRef = firestorage.ref(store, `posts/${post.writerID}/${post.postID}/${image}`);
                    return firestorage.getDownloadURL(urlRef);
                });
    
                downloadUrlPromises.push(Promise.all(imageUrlsPromise).then((imageUrls) => {
                    post.postImg = imageUrls;
                    resArr.push(post);
                }));
            }
    
            await Promise.all(downloadUrlPromises);
            resArr.sort((a, b) => {
                if (b.time === a.time) {
                    return b.likes - a.likes; 
                }
                return b.time - a.time;
            });
            const paginatedPosts = resArr.slice(start, start + limit);
    
    
            res.status(201).json(paginatedPosts);
        } catch (err) {
            next(err);
        }
    }
    
    async getPostsByLikes(req, res, next) {
        try {

            const limit = parseInt(req.query.limit) || 10; //http://localhost:8080/posts/?limit=5&start=5
            const start = parseInt(req.query.start) || 0; 

            const postsRef = db.collection("posts");
            const response = await postsRef.get();
            const resArr = [];
    
            const downloadUrlPromises = [];
    
            for (const doc of response.docs) {
                const post = doc.data();
                const images = post.postImg;
    
                const imageUrlsPromise = images.map(async (image) => {
                    const urlRef = firestorage.ref(store, `posts/${post.writerID}/${post.postID}/${image}`);
                    return firestorage.getDownloadURL(urlRef);
                });
    
                downloadUrlPromises.push(Promise.all(imageUrlsPromise).then((imageUrls) => {
                    post.postImg = imageUrls;
                    resArr.push(post);
                }));
            }
    
            await Promise.all(downloadUrlPromises);
    
            resArr.sort((a, b) => {
                if (b.likes === a.likes) {
                    return b.time - a.time; 
                }
                return b.likes - a.likes;
            });
            const paginatedPosts = resArr.slice(start, start + limit);
    
            res.status(201).json(paginatedPosts);
        } catch (err) {
            next(err);
        }
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

            const images = post.postImg;     
            const imageUrls = [];
                
            for (let i = 0; i < images.length; i++) {
                const urlRef = firestorage.ref(store, `posts/${post.writerID}/${post.postID}/${images[i]}`);
                const url = await firestorage.getDownloadURL(urlRef);
                console.log(url);                
                imageUrls.push(url); 
            }
                
            post.postImg = imageUrls; 
            
            res.status(200).json(post);
        } catch(err){
            next(err);
        }
    }

    
    async getUserPosts(req, res, next) {
        try {
            const postsRef = db.collection("posts");
            const response = await postsRef.get();
            const resArr = [];
    
            const userPostsPromises = [];
    
            for (const doc of response.docs) {
                const post = doc.data();
                if (post.writerID === req.params.writerID) {
                    const images = post.postImg;
                    const imageUrlsPromise = images.map(async (image) => {
                        const urlRef = firestorage.ref(store, `posts/${post.writerID}/${post.postID}/${image}`);
                        return firestorage.getDownloadURL(urlRef);
                    });
    
                    userPostsPromises.push(Promise.all(imageUrlsPromise).then((imageUrls) => {
                        post.postImg = imageUrls;
                        resArr.push(post);
                    }));
                }
            }
    
            await Promise.all(userPostsPromises);
    
            resArr.sort((a, b) => b.time - a.time);
    
            res.status(200).json(resArr);
        } catch (err) {
            next(err);
        }
    }
    


    // async getUserPost(req, res, next) {
    //     try {
    //         const postsRef = db.collection("posts");
    //         const response = await postsRef.get();
    //         let userPost;

    //         for (const doc of response.docs) {
    //             if (doc.data().writerID === req.params.writerID && doc.data().postID === req.params.postID) {
    //                 userPost = doc.data();
    //                 const images = userPost.postImg;
    //                 const imageUrls = [];

    //                 for (let i = 0; i < images.length; i++) {
    //                     try {
    //                         const urlRef = firestorage.ref(store, `posts/${userPost.writerID}/${userPost.postID}/${images[i]}`);
    //                         const url = await firestorage.getDownloadURL(urlRef);
    //                         imageUrls.push(url);
    //                     } catch (urlError) {
    //                         console.error("Error fetching image URL:", urlError);
    //                     }
    //                 }

    //                 userPost.postImg = imageUrls;
    //                 break; 
    //             }
    //         }

    //         if (!userPost) {
    //             throw  {status: 404, message: "존재하지 않는 게시글입니다."};
    //         }
    //         res.status(200).json(userPost);
    //     } catch (err) {
    //         next(err);
    //     }
    // }

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
            const imageKeys = Object.keys(postImg);
            const imgIDArr = [];
            const uploadPromises = [];
    
            // 딜레이를 추가하기 위한 변수
            let delay = 0;
    
            imageKeys.forEach((key) => {
                const image = postImg[key];
                const imageID = uuidRandom();
                imgIDArr.push(imageID);
                const imgRef = firestorage.ref(store, `posts/${writerID}/${postID}/${imageID}`);
                
                // setTimeout을 이용한 딜레이 추가
                const uploadPromise = new Promise((resolve) => {
                    setTimeout(async () => {
                        await firestorage.uploadString(imgRef, image, 'data_url', { content: 'image/jpg' });
                        resolve();
                    }, delay);
                });
    
                uploadPromises.push(uploadPromise);
                
                // 1초씩 딜레이 증가
                delay += 1000;
            });
    
            await Promise.all(uploadPromises);
    
            const date = new Date();
            const postJson = {
                postID: postID,
                title: title,
                body: body,
                writerID: writerID,
                writerName: writerName,
                likes: [],
                commentCount: Number(0),
                postImg: imgIDArr,
                time: date.getTime(),
                date: this.formatDateToYYYYMMDD(date)
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

    async deletePost(req,res,next){
        try{
            const postRef=db.collection("posts").doc(req.params.postID);
            const postSnapShot= await postRef.get();
            if(!postSnapShot.exists){
                throw {status: 404, message: "존재하지 않는 게시글입니다."};
            }
            const posts=await db.collection("posts").doc(req.params.postID).delete();
            res.status(204).json({message:"게시글이 삭제되었습니다."});
        } catch(err){
            next(err);
        }
    }
}

const postController=new PostController();

module.exports= postController;