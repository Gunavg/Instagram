import mongoose from "mongoose";

import Story from "../models/Story.model.js";
import StoryView from "../models/StoryView.model.js";
import StoryViewEvent from "../models/StoryViewEvent.model.js";
import StoryReaction from "../models/StoryReaction.model.js";
import StoryReply from "../models/StoryReply.model.js";

import { canViewStory } from "./story.controller.js";
import { io } from "../socket.js";

const getOwnedStory = async (storyId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(storyId) || !userId) return null;

  return Story.findOne({
    _id: storyId,
    user: userId,
    status: { $in: ["active", "archived"] },
  }).select(
    "user status expiresAt likesCount repliesCount viewsCount uniqueViewersCount completedViewsCount"
  );
};

const syncViewCounters = async (storyId) => {
  const [totalViews, uniqueViewers, completedViews] = await Promise.all([
    StoryViewEvent.countDocuments({ story: storyId }),
    StoryView.countDocuments({ story: storyId }),
    StoryView.countDocuments({ story: storyId, completedAt: { $ne: null } }),
  ]);

  await Story.findByIdAndUpdate(storyId, {
    $set: {
      viewsCount: totalViews,
      uniqueViewersCount: uniqueViewers,
      completedViewsCount: completedViews,
    },
  });

  return { totalViews, uniqueViewers, completedViews };
};

const emitAnalyticsUpdate = async (storyId) => {
  try {
    const [story, counters] = await Promise.all([
      Story.findById(storyId).select("likesCount repliesCount"),
      syncViewCounters(storyId),
    ]);

    if (!story || !io) return;

    io.to(`story-analytics:${storyId}`).emit("story-analytics-updated", {
      storyId: storyId.toString(),
      viewsCount: counters.totalViews,
      uniqueViewersCount: counters.uniqueViewers,
      completedViewsCount: counters.completedViews,
      likesCount: story.likesCount || 0,
      repliesCount: story.repliesCount || 0,
    });
  } catch (error) {
    console.error("Analytics socket error:", error.message);
  }
};

/* POST /api/stories/:storyId/view */
export const recordStoryView = async (req, res) => {
  try {
    const { storyId } = req.params;
    const viewerId = req.user?._id;

    if (!viewerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ success: false, message: "Invalid story ID" });
    }

    const story = await Story.findOne({
      _id: storyId,
      status: "active",
      expiresAt: { $gt: new Date() },
    }).select("user privacy");

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not available" });
    }

    if (!(await canViewStory(story, viewerId))) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this story",
      });
    }

    if (story.user.toString() === viewerId.toString()) {
      return res.status(200).json({
        success: true,
        counted: false,
        unique: false,
        completionAdded: false,
      });
    }

    const requestedMediaIndex = Number(req.body?.mediaIndex ?? 0);
    const mediaIndex = Number.isFinite(requestedMediaIndex)
      ? Math.max(0, Math.floor(requestedMediaIndex))
      : 0;
    const completed = req.body?.completed === true;
    const now = new Date();

    let view = await StoryView.findOne({
      story: storyId,
      viewer: viewerId,
    }).select("completedAt maxMediaIndex");

    let unique = false;
    let completionAdded = false;

    if (!view) {
      try {
        view = await StoryView.create({
          story: storyId,
          viewer: viewerId,
          firstViewedAt: now,
          lastViewedAt: now,
          maxMediaIndex: mediaIndex,
          completedAt: completed ? now : null,
        });
        unique = true;
        completionAdded = completed;
      } catch (error) {
        if (error?.code !== 11000) throw error;
        view = await StoryView.findOne({
          story: storyId,
          viewer: viewerId,
        }).select("completedAt maxMediaIndex");
      }
    }

    /* One viewing session is counted when the first media is shown. */
    if (mediaIndex === 0) {
      await StoryViewEvent.create({
        story: storyId,
        viewer: viewerId,
        mediaIndex,
        completed: false,
        viewedAt: now,
      });
    }

    if (view) {
      const wasCompleted = Boolean(view.completedAt);
      const update = {
        $set: { lastViewedAt: now },
        $max: { maxMediaIndex: mediaIndex },
      };

      if (completed && !wasCompleted) {
        update.$set.completedAt = now;
        completionAdded = true;
      }

      await StoryView.updateOne(
        { story: storyId, viewer: viewerId },
        update
      );
    }

    const counters = await syncViewCounters(storyId);
    await emitAnalyticsUpdate(storyId);

    return res.status(200).json({
      success: true,
      counted: mediaIndex === 0,
      unique,
      completionAdded,
      ...counters,
    });
  } catch (error) {
    console.error("Record story view error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record story view",
    });
  }
};

/* GET /api/stories/:storyId/analytics */
export const getStoryAnalytics = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const story = await getOwnedStory(storyId, userId);

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    const storyObjectId = story._id;

    const [counters, reactionStats, replyCount, timeline, viewers] =
      await Promise.all([
        syncViewCounters(storyObjectId),

        StoryReaction.aggregate([
          { $match: { story: storyObjectId } },
          { $group: { _id: "$reaction", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        StoryReply.countDocuments({ story: storyObjectId }),

        /* Every event is a viewing session, so repeat views appear here. */
        StoryViewEvent.aggregate([
          { $match: { story: storyObjectId } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d %H:00",
                  date: "$viewedAt",
                },
              },
              views: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        StoryView.find({ story: storyObjectId })
          .sort({ firstViewedAt: -1 })
          .limit(500)
          .populate("viewer", "_id username fullName profilePicture")
          .lean(),
      ]);

    const totalReactions = reactionStats.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const completionRate =
      counters.uniqueViewers === 0
        ? 0
        : Number(
            (
              (counters.completedViews / counters.uniqueViewers) * 100
            ).toFixed(2)
          );

    return res.status(200).json({
      success: true,
      analytics: {
        storyId: story._id,
        status: story.status,
        totalViews: counters.totalViews,
        uniqueViewers: counters.uniqueViewers,
        reactions: {
          total: totalReactions,
          breakdown: reactionStats,
        },
        replies: { total: replyCount },
        completedViews: counters.completedViews,
        completionRate,
        timeline,
        viewers,
      },
    });
  } catch (error) {
    console.error("Get story analytics error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get story analytics",
    });
  }
};