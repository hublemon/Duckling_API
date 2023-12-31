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
        this.router.post("/kind/skins",this.putSkinsAssets.bind(this)); 
        // this.router.post("/ar",this.putARAssets.bind(this)); 
        this.router.delete("/:kind",this.deleteKindAssets.bind(this)); 
    }


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
    
    async putSkinsAssets(req, res, next) {  //스스로 구현해냈다!
        try {
            const insertedAssets = [];
    
            const kindRef = firestorage.ref(store, `skins`);
            const kindResult = await firestorage.listAll(kindRef);
            // console.log(kindRef);
            for (const item of kindResult.items) {
                const assetPath = item.fullPath;
                // console.log(assetPath);
                const assetImg=await firestorage.getDownloadURL(item);
                // console.log(assetImg);
                const assetID = uuidRandom();
                const assetKindJson = {
                    assetID,
                    assetPath,
                    assetImg
                };
    
                const assetJson = {
                    assetRef: db.collection("skins").doc(assetID),
                };
    
                const kindDocRef = db.collection("skins").doc(assetID);
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
    
    
    
    async deleteKindAssets(req, res, next) {
        try {
            const kindRef = db.collection(`${req.params.kind}`);
            const kindSnapshot= await kindRef.get();

            if (!kindSnapshot) {
                throw { status: 404, message: "해당 에셋 종류는 존재하지 않습니다." };
            }
            const resArr = kindSnapshot.docs.map((doc) => doc.data());
            // console.log(resArr);
            for (const asset of resArr){
                const kindAssetRef=db.collection(`${req.params.kind}`).doc(asset["assetID"]);
                await kindAssetRef.delete();

                const assetRef = db.collection("assets").doc(asset["assetID"]);
                await assetRef.delete();
            }

            res.status(204).json();
        } catch (err) {
            // 에러 응답을 보냅니다.
            res.status(err.status || 500).json({ error: err.message });
        }
    }

}

const assetController=new AssetController();

module.exports= assetController;