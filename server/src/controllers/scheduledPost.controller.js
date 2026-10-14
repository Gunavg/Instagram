import ScheduledPost from "../models/ScheduledPost.model.js";
import User from "../models/User.model.js";
import { getPostAllowance } from "../middleware/subscription.middleware.js";
import { sendScheduledPostPublishedEmail } from "../services/notification.service.js";

const validateFuture = (value) => { const d = new Date(value); return !Number.isNaN(d.getTime()) && d.getTime() > Date.now(); };
const resolveTaggedUsers = async (names = []) => {
  if (!Array.isArray(names) || !names.length) return [];
  const usernames = names.map(v => String(v).replace(/^@/, "").trim().toLowerCase()).filter(Boolean).slice(0, 20);
  return (await User.find({ username: { $in: usernames } }).select("_id").lean()).map(u => u._id);
};

const ACTIVE_SCHEDULE_STATUSES = ["scheduled", "publishing"];

// Backfill reservation slots for active rows created before the slot index existed.
const ensureActiveScheduleSlots = async (userId) => {
  const active = await ScheduledPost.find({ user: userId, status: { $in: ACTIVE_SCHEDULE_STATUSES } })
    .select("_id activeSlot").sort({ createdAt: 1 }).lean();
  const occupied = new Set(active.map(row => row.activeSlot).filter(slot => slot === 0 || slot === 1));
  for (const row of active) {
    if (row.activeSlot === 0 || row.activeSlot === 1) continue;
    const slot = [0, 1].find(candidate => !occupied.has(candidate));
    if (slot === undefined) break;
    try {
      const claimed = await ScheduledPost.updateOne(
        { _id: row._id, status: { $in: ACTIVE_SCHEDULE_STATUSES }, activeSlot: { $exists: false } },
        { $set: { activeSlot: slot } },
      );
      if (claimed.modifiedCount) occupied.add(slot);
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
};

// The unique (user, activeSlot) index guarantees at most two concurrent active schedules.
const createWithReservedSlot = async (userId, data) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await ensureActiveScheduleSlots(userId);
    const active = await ScheduledPost.find({ user: userId, status: { $in: ACTIVE_SCHEDULE_STATUSES } })
      .select("activeSlot").lean();
    if (active.length >= 2) return null;
    const occupied = new Set(active.map(row => row.activeSlot).filter(slot => slot === 0 || slot === 1));
    const slot = [0, 1].find(candidate => !occupied.has(candidate));
    if (slot === undefined) continue;
    try {
      return await ScheduledPost.create({ ...data, activeSlot: slot });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      // Another request reserved the same slot; re-read active reservations.
    }
  }
  return null;
};

export const createScheduledPost = async (req, res) => {
  try {
    if (!validateFuture(req.body.scheduledAt)) return res.status(400).json({ success:false, message:"Scheduled date and time must be in the future." });
    if (!Array.isArray(req.body.media) || !req.body.media.length) return res.status(400).json({ success:false, message:"At least one media item is required." });
    const allowance = await getPostAllowance(req.user._id);
    if (allowance.plan !== "free" && allowance.subscription?.status !== "active") return res.status(403).json({ success:false, code:"SUBSCRIPTION_NOT_ACTIVE", message:"Your paid subscription is not active." });
    // Recheck the effective quota from the latest database state. The unique
    // activeSlot index below separately enforces the two-scheduled-post ceiling
    // when simultaneous requests race.
    if (!allowance.allowed) return res.status(403).json({ success:false, code:"SCHEDULE_QUOTA_REACHED", message:"Your subscription posting quota does not allow another scheduled post.", subscription:{plan:allowance.plan,limit:allowance.limit,published:allowance.used,scheduled:allowance.scheduled} });
    const taggedUsers = req.body.taggedUsers?.length ? req.body.taggedUsers : await resolveTaggedUsers(req.body.taggedUsernames);
    const post = await createWithReservedSlot(req.user._id, {
      user:req.user._id, media:req.body.media, caption:req.body.caption||"",
      hashtags:Array.isArray(req.body.hashtags)?req.body.hashtags:[], taggedUsers,
      location:req.body.location||"", visibility:req.body.visibility||"public",
      scheduledAt:new Date(req.body.scheduledAt), status:"scheduled",
    });
    if (!post) return res.status(403).json({success:false,code:"SCHEDULE_LIMIT_REACHED",message:"You can have a maximum of 2 scheduled posts at a time."});
    res.status(201).json({success:true,message:"Post scheduled successfully.",post});
  } catch(e) { res.status(400).json({success:false,message:e.message}); }
};

export const listMyScheduledPosts = async (req,res) => {
  try { const posts=await ScheduledPost.find({user:req.user._id}).sort({scheduledAt:1}).lean(); res.json({success:true,posts}); }
  catch(e) { res.status(500).json({success:false,message:e.message}); }
};

export const updateScheduledPost = async (req,res) => {
  try {
    const post=await ScheduledPost.findOne({_id:req.params.id,user:req.user._id,status:"scheduled",scheduledAt:{$gt:new Date()}});
    if(!post) return res.status(404).json({success:false,message:"Future scheduled post not found or cannot be edited anymore."});
    if(req.body.scheduledAt!==undefined&&!validateFuture(req.body.scheduledAt)) return res.status(400).json({success:false,message:"Rescheduled date and time must be in the future."});
    if(req.body.media!==undefined&&(!Array.isArray(req.body.media)||!req.body.media.length)) return res.status(400).json({success:false,message:"At least one media item is required."});
    for(const key of ["media","caption","hashtags","location","visibility"]) if(req.body[key]!==undefined) post[key]=req.body[key];
    if(req.body.taggedUsers!==undefined) post.taggedUsers=req.body.taggedUsers;
    if(req.body.taggedUsernames!==undefined) post.taggedUsers=await resolveTaggedUsers(req.body.taggedUsernames);
    if(req.body.scheduledAt!==undefined) post.scheduledAt=new Date(req.body.scheduledAt);
    await post.save();
    res.json({success:true,message:"Scheduled post updated.",post});
  } catch(e) { res.status(400).json({success:false,message:e.message}); }
};

export const cancelScheduledPost = async (req,res) => {
  try {
    const post=await ScheduledPost.findOneAndUpdate({_id:req.params.id,user:req.user._id,status:"scheduled",scheduledAt:{$gt:new Date()}},{$set:{status:"cancelled"},$unset:{activeSlot:1}},{new:true});
    if(!post) return res.status(404).json({success:false,message:"Future scheduled post not found or already processed."});
    res.json({success:true,message:"Scheduled post cancelled.",post});
  } catch(e) { res.status(400).json({success:false,message:e.message}); }
};

export const publishScheduledPost = async (post) => {
  const Post=(await import("../models/Post.model.js")).default;
  const UserModel=(await import("../models/User.model.js")).default;
  const user=await UserModel.findById(post.user);
  // The scheduled record ID is carried onto the published post so a crash after
  // post creation can be recovered without publishing a duplicate.
  const existing=await Post.findOne({scheduledPostId:post._id});
  const created=existing || await Post.create({
    user:post.user,media:post.media,caption:post.caption,hashtags:post.hashtags,
    taggedUsers:post.taggedUsers,location:post.location,visibility:post.visibility,
    scheduleStatus:"published",scheduledAt:post.scheduledAt,publishedAt:new Date(),
    scheduledPostId:post._id,
  });
  await UserModel.findByIdAndUpdate(post.user,{$set:{lastActiveAt:new Date()},...(existing?{}:{$inc:{PostCount:1}})});
  post.status="published";post.publishedAt=created.publishedAt;post.lastError="";post.activeSlot=undefined;
  await post.save();
  if(user?.email&&!post.notificationSentAt) {
    try {
      await sendScheduledPostPublishedEmail({to:user.email,userName:user.fullName,post:created});
      post.notificationSentAt=new Date();
      await post.save();
    } catch(error) { console.error("Scheduled publication email failed:",error.message); }
  }
  return created;
};
