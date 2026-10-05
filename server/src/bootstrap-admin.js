import "dotenv/config";
import bcrypt from "bcrypt";
import connectDB from "./config/db.js";
import User from "./models/User.model.js";
const run=async()=>{await connectDB();const email=process.env.ADMIN_EMAIL;const password=process.env.ADMIN_PASSWORD;if(!email||!password)throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");const hash=await bcrypt.hash(password,10);const user=await User.findOneAndUpdate({email},{username:process.env.ADMIN_USERNAME||"administrator",fullName:"InstAI Administrator",email,password:hash,role:"administrator",status:"active",isVerified:true},{upsert:true,new:true,setDefaultsOnInsert:true});console.log("Administrator ready:",user.email);process.exit(0)};run().catch(e=>{console.error(e);process.exit(1)});