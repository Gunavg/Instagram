import ScheduledPost from "../models/ScheduledPost.model.js";
import { getPostAllowance } from "../middleware/subscription.middleware.js";
import { sendScheduledPostPublishedEmail } from "../services/notification.service.js";

const validateFuture=(value)=>{const date=new Date(value);return !Number.isNaN(date.getTime())&&date.getTime()>Date.now()};
export const createScheduledPost=async(req,res)=>{
 try{
  if(!validateFuture(req.body.scheduledAt))return res.status(400).json({success:false,message:"Scheduled date and time must be in the future."});
  const existing=await ScheduledPost.countDocuments({user:req.user._id,status:"scheduled",scheduledAt:{$gt:new Date()}});
  if(existing>=2)return res.status(403).json({success:false,code:"SCHEDULE_LIMIT_REACHED",message:"You can have a maximum of 2 scheduled posts at a time."});
  const allowance=await getPostAllowance(req.user._id);
  if(!allowance.allowed)return res.status(403).json({success:false,code:"SCHEDULE_QUOTA_REACHED",message:"Your subscription posting quota does not allow another scheduled post.",subscription:{plan:allowance.plan,limit:allowance.limit,used:allowance.used,scheduled:existing}});
  if(!req.body.media?.length)return res.status(400).json({success:false,message:"At least one media item is required."});
  const subscription=await getPostAllowance(req.user._id);
  if(subscription.plan!=="free"&&subscription.subscription?.status!=="active")return res.status(403).json({success:false,code:"SUBSCRIPTION_NOT_ACTIVE",message:"Your paid subscription is not active."});
  const post=await ScheduledPost.create({user:req.user._id,media:req.body.media,caption:req.body.caption||"",hashtags:req.body.hashtags||[],taggedUsers:req.body.taggedUsers||[],location:req.body.location||"",visibility:req.body.visibility||"public",scheduledAt:new Date(req.body.scheduledAt),status:"scheduled"});
  res.status(201).json({success:true,message:"Post scheduled successfully.",post});
 }catch(e){res.status(500).json({success:false,message:e.message});}
};
export const listMyScheduledPosts=async(req,res)=>{try{const posts=await ScheduledPost.find({user:req.user._id}).sort({scheduledAt:1}).lean();res.json({success:true,posts});}catch(e){res.status(500).json({success:false,message:e.message});}};
export const updateScheduledPost=async(req,res)=>{
 try{const post=await ScheduledPost.findOne({_id:req.params.id,user:req.user._id,status:"scheduled"});if(!post)return res.status(404).json({success:false,message:"Scheduled post not found."});if(req.body.scheduledAt&&!validateFuture(req.body.scheduledAt))return res.status(400).json({success:false,message:"Rescheduled date and time must be in the future."});
 ["media","caption","hashtags","taggedUsers","location","visibility","scheduledAt"].forEach(k=>{if(req.body[k]!==undefined)post[k]=req.body[k] instanceof Array?req.body[k]:k==="scheduledAt"?new Date(req.body[k]):req.body[k]});await post.save();res.json({success:true,message:"Scheduled post updated.",post});
 }catch(e){res.status(400).json({success:false,message:e.message});}
};
export const cancelScheduledPost=async(req,res)=>{try{const post=await ScheduledPost.findOneAndUpdate({_id:req.params.id,user:req.user._id,status:"scheduled"},{status:"cancelled"},{new:true});if(!post)return res.status(404).json({success:false,message:"Scheduled post not found."});res.json({success:true,message:"Scheduled post cancelled.",post});}catch(e){res.status(400).json({success:false,message:e.message});}};
export const publishScheduledPost=async(post)=>{const Post=(await import("../models/Post.model.js")).default;const User=(await import("../models/User.model.js")).default;const user=await User.findById(post.user);const created=await Post.create({user:post.user,media:post.media,caption:post.caption,hashtags:post.hashtags,taggedUsers:post.taggedUsers,location:post.location,visibility:post.visibility,scheduleStatus:"published",scheduledAt:post.scheduledAt,publishedAt:new Date()});await User.findByIdAndUpdate(post.user,{$inc:{PostCount:1},$set:{lastActiveAt:new Date()}});post.status="published";post.publishedAt=created.publishedAt;await post.save();if(user)await sendScheduledPostPublishedEmail({to:user.email,userName:user.fullName,post});return created;};