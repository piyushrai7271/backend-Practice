import { ApiError } from "../utils/ApiError.js";
import { asynHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


const verifyJWT = asynHandler(async(req,_,next)=>{
  try {
      // get accessToken from cookies or header
      const token = await req.cookies?.accessToken  || req.header("Authorization")?.replace("Bearer ","");
  
      //check token is present or not
      if(!token){
          throw new ApiError(401,"Unothorized request");
      }
  
      //decode the token with jwt
        const decodedToken =  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
  
      //find user with decoded token   //remove password and refresh Token for decoded user
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
     
      //check if user is present or not if not send error message
  
      if(!user){
          throw new ApiError(404,"Invilade access token for user")
      }
      //if user present than than add user in req
      req.user = user;
  
      //than use next()
      next()
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalide access token")
  }
});


export {verifyJWT};