import { asynHandler } from "../utils/asyncHandler.js";


const registerUser = asynHandler (async(req,resp)=>{
    resp.status(200).json({
        message:"ok"
    })
})


export {registerUser};

