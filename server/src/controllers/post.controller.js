import User from "../models/User.model.js";
import Like from "../models/Like.model.js";

export const createPost = async (req, res) => {
  try {
    const { caption, location, media, taggedUsers, visibility, hashtags } = req.body;
    if (!media || media.length === 0) return res.status(400).json({ success:false, message:"Please upload at least one image" });
    const post = await (await import("../models/Post.model.js")).default.create({
      user:req.user._id,caption,location,media,taggedUsers,visibility,hashtags:Array.isArray(hashtags)?hashtags:[],
      scheduleStatus:"published",publishedAt:new Date()
    });
    await User.findByIdAndUpdate(req.user._id,{ $inc:{PostCount:1},$set:{lastActiveAt:new Date()} });
    res.status(201).json({success:true,message:"Post Created Successfully",post,posting:req.postAllowance?{...req.postAllowance,used:req.postAllowance.used+1,remaining:req.postAllowance.remaining===Infinity?Infinity:Math.max(0,req.postAllowance.remaining-1)}:null});
  } catch(error){console.log(error);res.status(500).json({success:false,message:error.message});}
};
export const getPosts = async(req,res)=>{
 try{const Post=(await import("../models/Post.model.js")).default;const posts=await Post.find({isDeleted:false,scheduleStatus:"published",publishedAt:{$ne:null}}).populate("user","username fullName profilePicture").lean();const postsWithLikes=await Promise.all(posts.map(async post=>({...post,likes:await Like.find({post:post._id}).populate("user","username fullName profilePicture")})));res.status(200).json({success:true,posts:postsWithLikes});}catch(error){res.status(500).json({success:false,message:error.message});}
};
export const getUserPosts=async(req,res)=>{
 try{const Post=(await import("../models/Post.model.js")).default;const user=await User.findOne({username:req.params.username});if(!user)return res.status(400).json({success:false,message:"User not found"});const posts=await Post.find({user:user._id,isDeleted:false,scheduleStatus:"published"}).sort({createdAt:-1});res.status(200).json({success:true,posts});}catch(error){res.status(500).json({success:false,message:error.message});}
};