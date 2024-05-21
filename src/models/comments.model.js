import mongoose from "mongoose";


const commentsSchema = new mongoose.Schema(
    {
        content:{
            type:String,
            toLowerCase:true,
        },
        video:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Video"
        },
        owner:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            index:true
        }
    },
    {timestamps:true}
);


export const Comment = mongoose.model("Comment",commentsSchema);