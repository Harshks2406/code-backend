import fs from "fs"
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_NAME, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudary = async (filePath) => {
    try {
        if(!filePath) return null
        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto"
        })
        // File has been uploaded
        console.log("File has been uploaded on cloudinary", response.url);
        return response
    } catch (error) {
        // Remove the locally saved temp file
        fs.unlinkSync(filePath)
        return null;
    }
}

export {uploadOnCloudary}
