import Story from "../models/Story.model.js";
import Follow from "../models/Follow.model.js";
import CloseFriend from "../models/CloseFriend.model.js";
import { uploadToCloudinary } from "../middleware/storyUpload.middleware.js";

const canViewStory = async (story, viewerId) => {
  if (story.user.toString() === viewerId.toString()) return true;
  if (story.privacy === "public") return true;

  if (story.privacy === "followers") {
    return Boolean(
      await Follow.exists({
        follower: viewerId,
        following: story.user,
      })
    );
  }

  if (story.privacy === "close_friends") {
    return Boolean(
      await CloseFriend.exists({
        owner: story.user,
        friend: viewerId,
      })
    );
  }

  return false;
};

export const createStory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image or video",
      });
    }

    const privacy = req.body?.privacy || "public";
    const allowedPrivacy = ["public", "followers", "close_friends"];

    if (!allowedPrivacy.includes(privacy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid privacy setting",
      });
    }

    const media = [];

    for (const file of req.files) {
      const uploaded = await uploadToCloudinary(file);

      media.push({
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        type: file.mimetype.startsWith("video/") ? "video" : "image",
        width: uploaded.width,
        height: uploaded.height,
        duration: uploaded.duration,
      });
    }

    if (media.length === 0 || media.some((item) => !item.url)) {
      return res.status(500).json({
        success: false,
        message: "Media upload failed",
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const story = await Story.create({
      user: req.user._id,
      media,
      privacy,
      status: "active",
      createdAt: now,
      expiresAt,
    });

    const populatedStory = await Story.findById(story._id).populate(
      "user",
      "_id username fullName profilePicture"
    );

    return res.status(201).json({
      success: true,
      message: "Story created successfully",
      story: populatedStory,
    });
  } catch (error) {
    console.error("Create story error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create story",
    });
  }
};

export const getStories = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const stories = await Story.find({
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "_id username fullName profilePicture")
      .sort({ createdAt: -1 })
      .lean();

    const visibleStories = [];

    for (const story of stories) {
      if (await canViewStory(story, req.user._id)) {
        visibleStories.push(story);
      }
    }

    return res.status(200).json({ success: true, stories: visibleStories });
  } catch (error) {
    console.error("Get stories error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stories",
    });
  }
};

/*
 * GET MY ARCHIVED STORIES
 * Used by the Highlights UI. Analytics are retained because archived
 * stories remain in MongoDB instead of being deleted.
 */
export const getMyArchivedStories = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const stories = await Story.find({
      user: req.user._id,
      status: "archived",
    })
      .select("_id media createdAt expiresAt status")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({ success: true, stories });
  } catch (error) {
    console.error("Get archived stories error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch archived stories",
    });
  }
};

export const deleteStory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const story = await Story.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: "active",
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found or already expired/deleted",
      });
    }

    story.status = "deleted";
    story.deletedAt = new Date();
    await story.save();

    return res.status(200).json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error) {
    console.error("Delete story error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete story",
    });
  }
};