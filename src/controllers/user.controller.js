import { asynHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    // putting refresh token into database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //it will help to avoid making validition
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "somthing went worng while generating access and refresh token"
    );
  }
};
//register user

const registerUser = asynHandler(async (req, resp) => {
  //getting user detail from front end or postman

  const { fullName, userName, email, password } = req.body;

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

  const existedUser = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (existedUser) {
    throw new ApiError(
      409,
      "user with same email or userName existed all ready"
    );
  }

  //checking image and avatar

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required !");
  }

  // uploading cover image and avtar on cloudanary

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  //again checking avatar and coverImage Uploaded on cloudanary or not

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); // this is how we remove any field from db

  if (!createdUser) {
    throw new ApiError(500, "somthing went wrong while registering user");
  }

  // returning response

  return resp
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered succussfully"));
});

//code for login user

const loginUser = asynHandler(async (req, resp) => {
  //get data from (req.body)
  const { userName, email, password } = req.body;

  //make login on basic of username,email
  if (!(userName || email)) {
    throw new ApiError(401, "Username or email is not present");
  }
  //check user is present or not and if not send error message
  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user does't exiest");
  }

  //check password is correct or not
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password is not Valid");
  }
  //if password is correct provide access and refresh token

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //send cookie
  // for sending cookies we have to desine some options
  const options = {
    // now these cookies can only modified from server
    httpOnly: true,
    secure: true,
  };

  //send response

  return resp
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: accessToken,
          refreshToken,
          loggedInUser,
        },
        "user loggedIn successfully"
      )
    );
});
// code for logout user

const logOutUser = asynHandler(async (req, resp) => {
  await User.findByIdAndUpdate(
    req.user._id, //this req.user comming from auth-middleware
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return resp
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User LogedOut"));
});

// endpoint code for getting new refreshToken after expirie of token

const refreshAccessToken = asynHandler(async (req, resp) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401);
    }

    const { accessToken, newRefreshToken } = generateAccessAndRefreshToken(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return resp
      .status(200)
      .cookies("accessToken", accessToken, options)
      .cookies("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// endpoint code for changing password

const changeCurrentPassword = asynHandler(async (req, resp) => {
  const { oldPassword, newPassword } = req.body;

  if (!(oldPassword && newPassword)) {
    throw new ApiError(402, "Pleas provide the old and new password");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "user not login");
  }

  const ispasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!ispasswordCorrect) {
    throw new ApiError(404, "oldPassword is wrong");
  }

  user.password = newPassword;
  user.save({ validateBeforeSave: false }).select("-password");

  return resp
    .status(201)
    .json(new ApiResponse(200, { user }, "password changed"));
});

// endpoint for updating userdetail

const updateUserDetails = asynHandler(async(req,resp)=>{

   const {fullName,email}= req.body;

   if(!(fullName && email )){
     throw new ApiError(401,"pleas provide the details which you want to update")
   }

   const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        fullName:fullName,
        email:email
      },
    },
    {
      new:true
    }
   ).select("-password")

   if(!user){
    throw new ApiError(401,"user is missing")
   }

   return resp.status(200)
              .json(200,user,"User details updated")

});

// update coverImage endpoint

const updateUserCoverImage = asynHandler(async(req,resp)=>{

    const coverImageLocalpath = req.file?.path;

    if(!coverImageLocalpath){
      throw new ApiError(404,"cover Image local path is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalpath);

    if(!coverImage.url){
       throw new ApiError(404,"cover image is missing")
    }

    const user = await User.findByIdAndUpdate(
       req.user._id,
       {
         coverImage:coverImage.url
       },
       {
        new:true
       }
    ).select("-password")

    return resp.status(200)
               .json(200,user,"cover Image updated")
});

const updateUserAvatar  = asynHandler(async(req,resp)=>{

    const avatarLocalfilePath = req.file?.path;

    if(!avatarLocalfilePath){
      throw new ApiError(404,"avatar local file path is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalfilePath);

    if(!avatar.url){
      throw new ApiError(402,"Avatar file is missing")
    }

    const user = await User.findByIdAndUpdate(
       req.user._id,
       {
        avatar:avatar.url
       },
       {
        new:true
       }
    ).select("-password")

    return resp.status(200)
               .json(200,{user}, "avatar file is updated")
})

//  emdpoint with aggregation pipeline

const getUserChannelProfile = asynHandler(async(req,resp)=>{
   
   const {userName} = req.params;

   if(!userName?.trim()){
     throw new ApiError(400,"username is missing")
   }

    const channel = await User.aggregate([
      {
        $match:{
          userName:userName?.toLowerCase()
        }
      },
      {
        $lookup:{
           from:"subscriptions",
           localField:"_id",
           foreignField:"channel",
           as:"subscribers"
        }
      },
      {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"subscriber",
          as:"subscribedTo"
        }
      },
      {
        $addFields:{
          subscribersCount:{
            $size:"$subscribers"
          },
          channelsSubscribedToCount:{
             $size:"$subscribedTo"
          },
          isSubscribed:{
             $cond:{
               if:{$in:[req.user?._id, "$subscribers.subscriber"]},
               then:true,
               else:false
             }
          }
        }
      },
      {
        $project:{
           fullName:1,
           userName:1,
           subscribersCount:1,
           channelsSubscribedToCount:1,
           isSubscribed:1,
           avatar:1,
           email:1,
           coverImage:1
        }
      }
   ])

   // TODO::-> console log this channel value

   if(!channel?.length){
      throw new ApiError(404,"channel does't exiest")
   }

   //here channel value is comming from aggregation so, it will bw array
 
  return resp.status(200)
             .json(
              new ApiResponse(200,channel[0],"user channel fetched successfully")
             ) 

})

const getWatchHistory = asynHandler(async(req,resp)=>{

   const user = await User.aggregate([
    {
      $match:{
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as: "watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    fullName:1,
                    userName:1,
                    avatar:1
                  }
                },
                {
                  $addFields:{
                    owner:{
                      $first:"$owner"
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
   ])

   return resp.status(200)
              .json(
                new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully")
              )
              
})


export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  updateUserDetails,
  updateUserCoverImage,
  updateUserAvatar,
  getUserChannelProfile,
  getWatchHistory
};
