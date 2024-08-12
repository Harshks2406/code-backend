import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectDB = async() => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`Mongo DB Connected | Host:  ${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.log("Mongo DB Connection Error: ", error);
        process.exit(1)
        
    }
}

export default connectDB