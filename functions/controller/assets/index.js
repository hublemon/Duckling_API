const express = require("express");
const router = express.Router();
const db=require("../app.js");

const firestorage=require("../../config.js");
const store= firestorage.getStorage();

const uuidRandom = require('uuid-random');

class AssetController{
    router
    path="/assets"
    posts = [{
        //assetID: "assetID",
        kind: "kind",
        asseetImg: "assetImg",
        assetGltf: "gltf",
    }]

    constructor(){
        this.router=router;
        this.init();
    }

    init(){
        this.router.get("/:assetID",this.getAsset.bind(this));
        this.router.get("/",this.getKindAssets.bind(this));
        this.router.post("/:kind",this.putAssets.bind(this)); 
        this.router.get("/ar/:assetID",this.getARAsset.bind(this));
        // this.router.get("/ar",this.getARAssets.bind(this));
        this.router.post("/ar",this.putARAssets.bind(this)); 
    }

    // async getARAssets(req, res, next) {
    //     try {
    //         const ARRef = await db.collection("ar");
    //         const response = await ARRef.get();
    
    //         const resArr = response.docs.map((doc) => doc.data());
    
    //         res.status(200).json(resArr);
    //     } catch (err) {
    //         next(err);
    //     }
    // }

    async getARAsset(req, res, next) {
        try {
            const assetID = req.params.assetID;
            const ARSnapshot = await db.collection("ar").doc(assetID).get();
            if (!ARSnapshot.exists) {
                throw { status: 404, message: "존재하지 않는 에셋입니다." };
            }

            const response = ARSnapshot.data();
            res.status(200).json(response);
        } catch (err) {
            next(err);
        }
    }

    async getKindAssets(req, res, next) {
        try {
            const kind = req.query.kind;
            const kindRef = db.collection(kind);
            const response = await kindRef.get();
    
            const resArr = response.docs.map((doc) => doc.data());
    
            res.status(200).json(resArr);
        } catch (err) {
            next(err);
        }
    }
    
    async getAsset(req, res, next) {
        try {
            const assetID = req.params.assetID;
            const kindSnapshot = await db.collection("assets").doc(assetID).get();
            if (!kindSnapshot.exists) {
                throw { status: 404, message: "존재하지 않는 에셋입니다." };
            }
    
            const data = kindSnapshot.data();
            
            if (!data) {
                throw { status: 500, message: "에셋에 데이터가 없습니다." };
            }
    
            const kind = Object.keys(data)[0];
    
            const assetSnapshot = await db.collection(kind).doc(assetID).get();

            if (!assetSnapshot.exists) {
                throw { status: 404, message: "존재하지 않는 에셋입니다." };
            }

            const response = assetSnapshot.data();
            res.status(200).json(response);
        } catch (err) {
            next(err);
        }
    }

    async putAssets(req, res, next) {  //스스로 구현해냈다!
        try {
            const kind = req.params.kind;
            const insertedAssets = [];
    
            const kindRef = firestorage.ref(store, `${kind}`);
            const kindResult = await firestorage.listAll(kindRef);
    
            for (const item of kindResult.prefixes) {
                const listResult = await firestorage.listAll(item);
                const items = listResult.items;
    
                const assetPath = items[0].fullPath;
                let [assetGltf, assetImg] = await Promise.all([
                    firestorage.getDownloadURL(items[0]),
                    firestorage.getDownloadURL(items[1]),
                ]);
    
                if (!(assetPath.endsWith('ltf') || assetPath.endsWith('glb'))) {
                    [assetGltf, assetImg] = [assetImg, assetGltf];
                }
    
                const assetID = uuidRandom();
                const assetKindJson = {
                    assetID,
                    assetPath,
                    assetImg,
                    assetGltf,
                };
    
                const assetJson = {
                    assetRef: db.collection(kind).doc(assetID),
                };
    
                const kindDocRef = db.collection(kind).doc(assetID);
                const assetDocRef = db.collection("assets").doc(assetID);
    
                await Promise.all([
                    kindDocRef.set(assetKindJson, { merge: true }),
                    assetDocRef.set(assetJson, { merge: true }),
                ]);
    
                insertedAssets.push(assetJson);
            }
    
            res.status(201).json(insertedAssets);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }
    
    

    
    async putARAssets(req, res, next) {
        try {
            const assetslist = req.body;
            const insertedAssets = []; // 배열로 모든 asset을 저장할 변수 추가
    
            for (let i = 0; i < assetslist.length; i++) {
                if (!assetslist[i].assetImg || !assetslist[i].assetGltf) {
                    console.log("오류 인덱스", i);
                    throw { status: 400, message: "에셋 정보가 부족합니다." };
                }
                const assetID = uuidRandom();
                const assetJson = {
                    assetID: assetID,
                    assetImg: assetslist[i].assetImg,
                    assetGltf: assetslist[i].assetGltf
                };
                const assetRef = db.collection("ar").doc(assetID);
                await assetRef.set(assetJson, { merge: true });
    
                insertedAssets.push(assetJson);
            }
            res.status(201).json(insertedAssets);
        } catch (err) {
            // 에러 응답을 보냅니다.
            res.status(err.status || 500).json({ error: err.message });
        }
    }
    

}

const assetController=new AssetController();

module.exports= assetController;