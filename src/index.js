import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

const PORT = process.env.PORT || 8000
connectDB()
.then(() => {
    app.listen(PORT, ()=> {
        console.log(`Server started at http://localhost:${PORT}`)
    })
})
.catch((err) => {
    console.log("Mongo DB Connection Failure: ", err);
    
})