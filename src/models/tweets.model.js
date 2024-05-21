import mongoose from "mongoose";


const tweetsSchema = new mongoose.Schema(
    {
        owner:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
            index:true
        },
        content:{
            type:String,
            required:true,
            toLowerCase:true
        }
    },
    {timestamps:true}
);


export const Tweet = mongoose.model("Tweet",tweetsSchema);