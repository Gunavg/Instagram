import ScheduledPost from "../models/ScheduledPost.model.js";
import User from "../models/User.model.js";
import { getPostAllowance } from "../middleware/subscription.middleware.js";
import { sendScheduledPostPublishedEmail } from "../services/notification.service.js";

const validateFuture=value=>{const d=new Date(value);return !Number.isNaN(d.getTime())&&d.getTime()>Date.now();};
const resolveTaggedUsers=async(names=[])=>{if(!Array.isArray(names)||!names.length)return [];const usernames=names.map(v=>String(v).replace(/^@/,"").trim().toLowerCase()).filter(Boolean).slice(0,20);return (await User.find({username:{$in:usernames}}).select("_id").lean()).map(u=>u._id);};
export const createScheduledPost=async(req,res)=>{try{
 if(!validateFuture(req.body.scheduledAt))return res.status(400).json({success:false,message:"Scheduled date and time must be in the future."});
 if(!Array.isArray(req.body.media)||!req.body.media.length)return res.status(400).json({success:false,message:"At least one media item is required."});
 const allowance=await getPostAllowance(req.user._id);
 if(allowance.plan!=="free"&&allowance.subscription?.status!=="active")return res.status(403).json({success:false,code:"SUBSCRIPTION_NOT_ACTIVE",message:"Your paid subscription is not active."});
 if(allowance.scheduled>=2)return res.status(403).json({success:false,code:"SCHEDULE_LIMIT_REACHED",message:"You can have a maximum of 2 scheduled posts at a time."});
 if(!allowance.allowed)return res.status(403).json({success:false,code:"SCHEDULE_QUOTA_REACHED",message:"Your subscription posting quota does not allow another scheduled post.",subscription:{plan:allowance.plan,limit:allowance.limit,published:allowance.used,scheduled:allowance.scheduled}});
 const taggedUsers=req.body.taggedUsers?.length?req.body.taggedUsers:await resolveTaggedUsers(req.body.taggedUsernames);
 const post=await ScheduledPost.create({user:req.user._id,media:req.body.media,caption:req.body.caption||"",hashtags:Array.isArray(req.body.hashtags)?req.body.hashtags:[],taggedUsers,location:req.body.location||"",visibility:req.body.visibility||"public",scheduledAt:new Date(req.body.scheduledAt),status:"scheduled"});
 res.status(201).json({success:true,message:"Post scheduled successfully.",post});
 }catch(e){res.status(400).json({success:false,message:e.message});}};
export const listMyScheduledPosts=async(req,res)=>{try{const posts=await ScheduledPost.find({user:req.user._id}).sort({scheduledAt:1}).lean();res.json({success:true,posts});}catch(e){res.status(500).json({success:false,message:e.message});}};
export const updateScheduledPost=async(req,res)=>{try{
 const post=await ScheduledPost.findOne({_id:req.params.id,user:req.user._id,status:"scheduled"});if(!post)return res.status(404).json({success:false,message:"Scheduled post not found or cannot be edited anymore."});
 if(req.body.scheduledAt!==undefined&&!validateFuture(req.body.scheduledAt))return res.status(400).json({success:false,message:"Rescheduled date and time must be in the future."});
 if(req.body.scheduledAt!==undefined&&new Date(post.scheduledAt)<=new Date())return res.status(400).json({success:false,message:"Only posts scheduled for a future time can be edited."});
 if(req.body.media!==undefined&&(!Array.isArray(req.body.media)||!req.body.media.length))return res.status(400).json({success:false,message:"At least one media item is required."});
 for(const key of ["media","caption","hashtags","location","visibility"])if(req.body[key]!==undefined)post[key]=req.body[key];
 if(req.body.taggedUsers!==undefined)post.taggedUsers=req.body.taggedUsers;
 if(req.body.taggedUsernames!==undefined)post.taggedUsers=await resolveTaggedUsers(req.body.taggedUsernames);
 if(req.body.scheduledAt!==undefined)post.scheduledAt=new Date(req.body.scheduledAt);
 await post.save();res.json({success:true,message:"Scheduled post updated.",post});
 }catch(e){res.status(400).json({success:false,message:e.message});}};
export const cancelScheduledPost=async(req,res)=>{try{const post=await ScheduledPost.findOneAndUpdate({_id:req.params.id,user:req.user._id,status:"scheduled",scheduledAt:{$gt:new Date()}},{status:"cancelled"},{new:true});if(!post)return res.status(404).json({success:false,message:"Future scheduled post not found or already processed."});res.json({success:true,message:"Scheduled post cancelled.",post});}catch(e){res.status(400).json({success:false,message:e.message});}};
export const publishScheduledPost=async(post)=>{
 const Post=(await import("../models/Post.model.js")).default;
 const user=await User.findById(post.user);
 const created=await Post.create({user:post.user,media:post.media,caption:post.caption,hashtags:post.hashtags,taggedUsers:post.taggedUsers,location:post.location,visibility:post.visibility,scheduleStatus:"published",scheduledAt:post.scheduledAt,publishedAt:new Date()});
 await User.findByIdAndUpdate(post.user,{$inc:{PostCount:1},$set:{lastActiveAt:new Date()}});
 post.status="published";post.publishedAt=created.publishedAt;post.lastError="";await post.save();
 if(user?.email){try{await sendScheduledPostPublishedEmail({to:user.email,userName:user.fullName,post:created});}catch(error){console.error("Scheduled publication email failed:",error.message);}}
 return created;
};
