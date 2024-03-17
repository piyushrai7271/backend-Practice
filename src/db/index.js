import mongoose from "mongoose";
import { DB_NAME } from "../Constant.js";

const connectDB = async () => {
   try {
     const  connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
     console.log(`\n Mongodb connected !! DB HOST: ${connectionInstance.Connection.host}`);
   } catch (error) {
     console.log("Mongodb connection error",error);
     process.exit(1);
   }
}

export default connectDB;