import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResonse.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudary } from "../utils/cloudinary.js"

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

    const avatarLocalPath = req.file?.avatar[0]?.path
    const coverageImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudary(avatarLocalPath)
    const coverageImage = await uploadOnCloudary(coverageImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }
    
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverageImage: coverageImage?.url || "",
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

export { registerUser }