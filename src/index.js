// require('dotenv').config({path:'./env'})

import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv"; // this is for handling environment variable

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 4500, () => {
      console.log(`App started at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(`Mongo Db connection failed !!!   ${err}`);
  });













  

/*
import express from "express";

const app = express();


(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERROR",error);
            throw error;
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App started at port : ${process.env.PORT}`)
        })

    } catch (error) {
        console.log("Error",error)
        throw error;
    }
})() */
