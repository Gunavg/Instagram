import ScheduledPost from "../models/ScheduledPost.model.js";
import { sendScheduledPostPublishedEmail } from "../services/notification.service.js";

const validateFuture = (value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
};

export const createScheduledPost = async (req, res) => {
  try {
    if (!validateFuture(req.body.scheduledAt)) {
      return res.status(400).json({ success: false, message: "Scheduled date and time must be in the future." });
    }
    if (!req.body.media?.length) {
      return res.status(400).json({ success: false, message: "At least one media item is required." });
    }

    const post = await ScheduledPost.create({
      user: req.user._id,
      media: req.body.media,
      caption: req.body.caption || "",
      hashtags: Array.isArray(req.body.hashtags) ? req.body.hashtags : [],
      taggedUsers: Array.isArray(req.body.taggedUsers) ? req.body.taggedUsers : [],
      location: req.body.location || "",
      visibility: req.body.visibility || "public",
      scheduledAt: new Date(req.body.scheduledAt),
      status: "scheduled",
    });

    res.status(201).json({ success: true, message: "Post scheduled successfully.", post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listMyScheduledPosts = async (req, res) => {
  try {
    const posts = await ScheduledPost.find({ user: req.user._id }).sort({ scheduledAt: 1 }).lean();
    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateScheduledPost = async (req, res) => {
  try {
    const post = await ScheduledPost.findOne({ _id: req.params.id, user: req.user._id, status: "scheduled" });
    if (!post) return res.status(404).json({ success: false, message: "Scheduled post not found or can no longer be edited." });

    if (req.body.scheduledAt && !validateFuture(req.body.scheduledAt)) {
      return res.status(400).json({ success: false, message: "Rescheduled date and time must be in the future." });
    }

    for (const key of ["media", "caption", "hashtags", "taggedUsers", "location", "visibility"]) {
      if (req.body[key] !== undefined) post[key] = req.body[key];
    }
    if (req.body.scheduledAt !== undefined) post.scheduledAt = new Date(req.body.scheduledAt);
    await post.save();
    res.json({ success: true, message: "Scheduled post updated.", post });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const cancelScheduledPost = async (req, res) => {
  try {
    const post = await ScheduledPost.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "scheduled" },
      { status: "cancelled" },
      { new: true },
    );
    if (!post) return res.status(404).json({ success: false, message: "Scheduled post not found or already processed." });
    res.json({ success: true, message: "Scheduled post cancelled.", post });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const publishScheduledPost = async (post) => {
  const Post = (await import("../models/Post.model.js")).default;
  const User = (await import("../models/User.model.js")).default;
  const user = await User.findById(post.user);

  const created = await Post.create({
    user: post.user,
    media: post.media,
    caption: post.caption,
    hashtags: post.hashtags,
    taggedUsers: post.taggedUsers,
    location: post.location,
    visibility: post.visibility,
    scheduleStatus: "published",
    scheduledAt: post.scheduledAt,
    publishedAt: new Date(),
  });

  await User.findByIdAndUpdate(post.user, { $inc: { PostCount: 1 }, $set: { lastActiveAt: new Date() } });
  post.status = "published";
  post.publishedAt = created.publishedAt;
  post.lastError = "";
  await post.save();

  if (user?.email) {
    try {
      await sendScheduledPostPublishedEmail({ to: user.email, userName: user.fullName, post: created });
    } catch (emailError) {
      console.error("Scheduled post publication email failed:", emailError.message);
    }
  }

  return created;
};
