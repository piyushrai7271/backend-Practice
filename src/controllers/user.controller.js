import { asynHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";

const registerUser = asynHandler(async (req, resp) => {
 
    //getting user detail from front end or postman

  const { fullName, userName, email,password } = req.body;

  //   console.log("email :", email);

  // by using if else we can check all validation its just basic -- but here we are using *some* method to check validition
  // validation of - not empty field
   
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already existed : username, email
  // here user can directly connect to database because it is having mongoose
     
    const  existedUser = await User.findOne({
        $or:[{email},{userName}]
    })
    if(existedUser){
        throw new ApiError(409, "user with same email or userName existed all ready");
    }

    //checking image and avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
      coverImageLocalPath = req.files.coverImage[0].path
    }

    if(! avatarLocalPath){
        throw new ApiError(400,"Avatar file is required !");
    }

    // uploading cover image and avtar on cloudanary

    const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);

   //again checking avatar and coverImage Uploaded on cloudanary or not

   if(!avatar){
    throw new ApiError(400,"Avatar file is required");
   }

   const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase()
   })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ) // this is how we remove any field from db

  if(!createdUser){
    throw new ApiError(500, "somthing went wrong while registering user");
  }

  // returning response 

  return resp.status(201).json(
    new ApiResponse(200, createdUser, "user registered succussfully")
  )
  

});

export { registerUser };
