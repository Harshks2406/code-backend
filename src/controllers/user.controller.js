import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResonse.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const access_token = user.generateAccessToken()
        const refresh_token = user.generateRefreshToken()
        user.refreshToken = refresh_token
        await user.save({validateBeforeSave: false}) // validateBeforeSave - No validation required
        return {access_token, refresh_token}
    } catch (error) {
        throw new ApiError(400, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler(async(req, res) => {
    const {fullName, email, username, password} = req.body
    
    if([fullName, email, username, password].some((field)=> field?.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }

    const is_exists = await User.findOne({
        $or: [{username}, {email}]
    })

    if(is_exists){
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPath

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImag.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    } 

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudary(avatarLocalPath)
    const coverImage = await uploadOnCloudary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }
    
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async(req, res) => {

    const {email, username, password} = req.body
    if(!email && !username){
        throw new ApiError(400, "Username or email is required")
    }
    
    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    if(!user){
        throw new ApiError(404, "User does not exists")
    }

    const is_valid_password = await user.isPasswordCorrect(password)
    if(!is_valid_password){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {access_token, refresh_token} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", access_token, options)
    .cookie("refreshToken", refresh_token, options)
    .json(
        new ApiResponse(
            200, {user: loggedInUser, access_token, refresh_token}, "User logged in successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
    {
        $set: {
            refreshToken: undefined
        }
    })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "Used logged out succesfully")
    )
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken

    if(!token){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decoded_token = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decoded_token?._id).select("-password")
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
        console.log(user)
    
        if(token != user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or invalid")
        }
    
        const {access_token, refresh_token} = await generateAccessAndRefreshTokens(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", access_token, options)
        .cookie("refreshToken", refresh_token, options)
        .json(
            new ApiResponse(
                200, {user, access_token, refresh_token}, "Token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export { 
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken 
}