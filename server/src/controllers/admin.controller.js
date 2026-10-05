import User from "../models/User.model.js";
import Post from "../models/Post.model.js";
import Story from "../models/Story.model.js";
import Subscription from "../models/Subscription.model.js";
import Payment from "../models/Payment.model.js";
import AdminAuditLog from "../models/AdminAuditLog.model.js";
import ScheduledPostError from "../models/ScheduledPostError.model.js";
import ScheduledPost from "../models/ScheduledPost.model.js";
import { auditAdminAction } from "../middleware/admin.middleware.js";

const dateFilter=(query,field)=>{
  const out={};
  if(query.from||query.to){out[field]={}; if(query.from) out[field].$gte=new Date(query.from); if(query.to){const d=new Date(query.to);d.setHours(23,59,59,999);out[field].$lte=d;}}
  return out;
};
const pageArgs=(q)=>{const page=Math.max(1,Number(q.page)||1),limit=Math.min(100,Math.max(1,Number(q.limit)||20));return {page,limit,skip:(page-1)*limit};};
const search=(q,fields)=>q.search?{$or:fields.map(f=>({[f]:{$regex:String(q.search).slice(0,80),$options:"i"}}))}:{};

export const dashboard=async(req,res)=>{
 try{
  const activeSince=new Date(Date.now()-30*864e5);
  const [users,active,posts,stories,subscriptions,reports,schedules,eng1,eng2,eng3]=await Promise.all([
   User.countDocuments(),User.countDocuments({status:"active",lastActiveAt:{$gte:activeSince}}),Post.countDocuments({isDeleted:false,scheduleStatus:"published"}),Story.countDocuments({status:{$ne:"deleted"}}),Subscription.countDocuments({status:"active"}),Post.countDocuments({publishError:{$ne:""}}),Post.countDocuments({scheduleStatus:"scheduled"}),Post.aggregate([{$match:{isDeleted:false,scheduleStatus:"published"}},{$group:{_id:null,v:{$sum:"$likesCount"}}}]),Post.aggregate([{$match:{isDeleted:false,scheduleStatus:"published"}},{$group:{_id:null,v:{$sum:"$commentsCount"}}}]),Post.aggregate([{$match:{isDeleted:false,scheduleStatus:"published"}},{$group:{_id:null,v:{$sum:"$sharesCount"}}}])
  ]);
  res.json({success:true,stats:{totalUsers:users,activeUsers:active,posts,stories,subscriptions,reportedContent:reports,scheduledPosts:schedules,engagement:{likes:eng1[0]?.v||0,comments:eng2[0]?.v||0,shares:eng3[0]?.v||0}}});
 }catch(e){res.status(500).json({success:false,message:e.message});}
};

export const getUsers=async(req,res)=>{
 try{const {page,limit,skip}=pageArgs(req.query);const f={...dateFilter(req.query,"createdAt"),...search(req.query,["username","fullName","email"])};
  if(req.query.status)f.status=req.query.status;if(req.query.role)f.role=req.query.role;if(req.query.verified)f.isVerified=req.query.verified==="true";if(req.query.subscriptionPlan){const ids=(await Subscription.find({plan:req.query.subscriptionPlan}).select("user")).map(x=>x.user);f._id={$in:ids};}
  const sort=req.query.sort==="oldest"?{createdAt:1}:{createdAt:-1};const [items,total]=await Promise.all([User.find(f).select("-password -refreshToken").sort(sort).skip(skip).limit(limit).lean(),User.countDocuments(f)]);
  res.json({success:true,items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}})
 }catch(e){res.status(500).json({success:false,message:e.message});}
};
export const updateUser=async(req,res)=>{try{const allowed={status:"status",role:"role",isVerified:"isVerified"};const updates={};for(const k of Object.keys(allowed))if(req.body[k]!==undefined)updates[k]=req.body[k];const user=await User.findByIdAndUpdate(req.params.id,updates,{new:true}).select("-password -refreshToken");if(!user)return res.status(404).json({success:false,message:"User not found"});await auditAdminAction({req,action:"UPDATE_USER",entityType:"User",entityId:user._id,targetUser:user._id,metadata:updates});res.json({success:true,user});}catch(e){res.status(400).json({success:false,message:e.message});}};
export const deleteUser=async(req,res)=>{try{if(String(req.params.id)===String(req.user._id))return res.status(400).json({success:false,message:"You cannot delete your own administrator account."});const user=await User.findByIdAndDelete(req.params.id);if(!user)return res.status(404).json({success:false,message:"User not found"});await auditAdminAction({req,action:"DELETE_USER",entityType:"User",entityId:user._id,targetUser:user._id,metadata:{username:user.username}});res.json({success:true,message:"User deleted"});}catch(e){res.status(400).json({success:false,message:e.message});}};

export const getPosts=async(req,res)=>{try{const {page,limit,skip}=pageArgs(req.query);const f={...dateFilter(req.query,"createdAt"),...search(req.query,["caption","location","hashtags"])};f.isDeleted=req.query.includeDeleted==="true"?{$in:[true,false]}:false;if(req.query.visibility)f.visibility=req.query.visibility;if(req.query.scheduleStatus)f.scheduleStatus=req.query.scheduleStatus;const [items,total]=await Promise.all([Post.find(f).populate("user","username fullName email").sort({createdAt:-1}).skip(skip).limit(limit).lean(),Post.countDocuments(f)]);res.json({success:true,items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});}catch(e){res.status(500).json({success:false,message:e.message});}};
export const updatePost=async(req,res)=>{try{const allowed=["caption","location","visibility","isArchived","isDeleted","scheduleStatus"];const updates={};for(const k of allowed)if(req.body[k]!==undefined)updates[k]=req.body[k];const post=await Post.findByIdAndUpdate(req.params.id,updates,{new:true});if(!post)return res.status(404).json({success:false,message:"Post not found"});await auditAdminAction({req,action:"UPDATE_POST",entityType:"Post",entityId:post._id,targetUser:post.user,metadata:updates});res.json({success:true,post});}catch(e){res.status(400).json({success:false,message:e.message});}};
export const deletePost=async(req,res)=>{try{const post=await Post.findByIdAndUpdate(req.params.id,{isDeleted:true,scheduleStatus:"cancelled"},{new:true});if(!post)return res.status(404).json({success:false,message:"Post not found"});await auditAdminAction({req,action:"DELETE_POST",entityType:"Post",entityId:post._id,targetUser:post.user});res.json({success:true,message:"Post deleted"});}catch(e){res.status(400).json({success:false,message:e.message});}};

export const getStories=async(req,res)=>{try{const {page,limit,skip}=pageArgs(req.query);const f={...dateFilter(req.query,"createdAt"),...search(req.query,[])};if(req.query.status)f.status=req.query.status;if(req.query.privacy)f.privacy=req.query.privacy;const [items,total]=await Promise.all([Story.find(f).populate("user","username fullName").sort({createdAt:-1}).skip(skip).limit(limit).lean(),Story.countDocuments(f)]);res.json({success:true,items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});}catch(e){res.status(500).json({success:false,message:e.message});}};
export const deleteStory=async(req,res)=>{try{const story=await Story.findByIdAndUpdate(req.params.id,{status:"deleted",deletedAt:new Date()},{new:true});if(!story)return res.status(404).json({success:false,message:"Story not found"});await auditAdminAction({req,action:"DELETE_STORY",entityType:"Story",entityId:story._id,targetUser:story.user});res.json({success:true,message:"Story deleted"});}catch(e){res.status(400).json({success:false,message:e.message});}};

export const getSubscriptions=async(req,res)=>{try{const {page,limit,skip}=pageArgs(req.query);const f={...dateFilter(req.query,"createdAt")};if(req.query.plan)f.plan=req.query.plan;if(req.query.status)f.status=req.query.status;const [items,total]=await Promise.all([Subscription.find(f).populate("user","username fullName email isVerified").sort({createdAt:-1}).skip(skip).limit(limit).lean(),Subscription.countDocuments(f)]);res.json({success:true,items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});}catch(e){res.status(500).json({success:false,message:e.message});}};
export const updateSubscription=async(req,res)=>{try{const allowed=["plan","status","cancelAtPeriodEnd","nextRenewalDate"];const updates={};for(const k of allowed)if(req.body[k]!==undefined)updates[k]=req.body[k];const sub=await Subscription.findByIdAndUpdate(req.params.id,updates,{new:true});if(!sub)return res.status(404).json({success:false,message:"Subscription not found"});await auditAdminAction({req,action:"UPDATE_SUBSCRIPTION",entityType:"Subscription",entityId:sub._id,targetUser:sub.user,metadata:updates});res.json({success:true,subscription:sub});}catch(e){res.status(400).json({success:false,message:e.message});}};

export const getScheduledPosts=async(req,res)=>{try{const {page,limit,skip}=pageArgs(req.query);const f={...dateFilter(req.query,"scheduledAt"),...search(req.query,["caption","location","hashtags"])};if(req.query.status)f.status=req.query.status;else f.status={$in:["scheduled","published","cancelled","failed"]};const [items,total]=await Promise.all([ScheduledPost.find(f).populate("user","username fullName email").sort({scheduledAt:1}).skip(skip).limit(limit).lean(),ScheduledPost.countDocuments(f)]);res.json({success:true,items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});}catch(e){res.status(500).json({success:false,message:e.message});}};
export const getAuditLogs=async(req,res)=>{try{const {page,limit,skip}=pageArgs(req.query);const f={...dateFilter(req.query,"createdAt")};if(req.query.action)f.action=req.query.action;const [items,total]=await Promise.all([AdminAuditLog.find(f).populate("admin","username email").populate("targetUser","username").sort({createdAt:-1}).skip(skip).limit(limit).lean(),AdminAuditLog.countDocuments(f)]);res.json({success:true,items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});}catch(e){res.status(500).json({success:false,message:e.message});}};