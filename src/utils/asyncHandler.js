const asynHandler = (requestHandler) => {
    (req,resp,next)=>{
        Promise.resolve(requestHandler(req,resp,next))
        .catch((err)=>next (err))
    }
}

export {asynHandler};











//this upper code can also be written like this using try and catch


// const asyncHandler = (fn) => async (req,resp,next) =>{
//    try {
        // await fn(req,resp,next);
//    } catch (error) {
//     resp.status(error.code || 500).json({
//         success:false,
//         massage:error.massage
//     })
//    }
// }