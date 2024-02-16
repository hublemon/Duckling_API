const express = require("express");
const router = express.Router();
const db=require("../app.js");

const uuidRandom = require('uuid-random');

class CommentController{
    router
    path="/comments"
    posts = [{
        commentID: "commentID",
        text: "text",
        rootID: "rootID",
        writerID: "writerID",
        time: "time",
        date: "date"
    }]
   

    constructor(){
        this.router=router;
        this.init();
        //console.log("No errer");
    }

    init(){
        this.router.get("/:rootID",this.getComments.bind(this));
        this.router.post("/",this.putComment.bind(this));
        this.router.delete("/:commentID",this.deleteComment.bind(this));
    }


    async getComments(req, res, next) {
        try {
            const commentsRef = db.collection("comments");
            const response = await commentsRef.where("rootID", "==", req.params.rootID).get();
    
            if (response.empty) {
                throw { status: 404, message: "존재하지 않는 댓글입니다" };
            }
    
            const resArr = response.docs.map((doc) => doc.data());
            resArr.sort((a, b) => a['time'] - b['time']);
    
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


    async putComment(req,res,next){
        try{
            const {text ,rootID, writerID}=req.body;
            if(!text||!rootID||!writerID){
                throw {status: 400, message: "댓글 정보가 부족합니다."};
            }
            const date = new Date();
            const commentID= uuidRandom();
            const commentJson={
                commentID: commentID,
                text: text,
                rootID: rootID,
                writerID: writerID,
                time: date.getTime(),
                date: this.formatDateToYYYYMMDD(date)
            };
            await db.collection("comments").doc(commentID).set(commentJson);
            const postRef = db.collection("posts").doc(rootID);
        
            const postDoc = await postRef.get();
            let commentCount = postDoc.data().commentCount || 0;
            commentCount += 1;

            await postRef.update({ commentCount: commentCount });


            res.status(201).json(commentJson);
        } catch(err){
            next(err);
        }
    }


    async deleteComment(req, res, next) {
        try {
            const commentID = req.params.commentID;
            const commentRef = db.collection("comments").doc(commentID);
            const commentSnapshot = await commentRef.get();
    
            if (!commentSnapshot.exists) {
                throw { status: 404, message: "존재하지 않는 댓글입니다." };
            }
    
            const rootID = commentSnapshot.data().rootID;
            const postRef = db.collection("posts").doc(rootID);
            const postSnapshot = await postRef.get();
    
            let commentCount = await postSnapshot.data().commentCount > 0 ? postSnapshot.data().commentCount - 1 : 0;
    
            await Promise.all([
                postRef.update({ commentCount: commentCount }),
                commentRef.delete()
            ]);
    
            res.status(204).json({ message: "답글이 삭제되었습니다." });
        } catch (error) {
            next(error);
        }
    }
}

const commentController=new CommentController();

module.exports= commentController;