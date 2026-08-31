import mongoose from "mongoose";
import Story from "../models/Story.model.js";
import StoryView from "../models/StoryView.model.js";
import StoryReaction from "../models/StoryReaction.model.js";
import StoryReply from "../models/StoryReply.model.js";
import { io } from "../socket.js";

const getOwnedStory = async (storyId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(storyId)) {
    return null;
  }

  return Story.findOne({
    _id: storyId,
    user: userId,
    status: { $in: ["active", "archived"] },
  }).select(
    "user status expiresAt viewsCount uniqueViewersCount completedViewsCount likesCount repliesCount"
  );
};

const emitAnalyticsUpdate = async (storyId) => {
  try {
    const story = await Story.findById(storyId).select(
      "viewsCount uniqueViewersCount completedViewsCount likesCount repliesCount"
    );

    if (!story || !io) return;

    io.to(`story-analytics:${storyId}`).emit(
      "story-analytics-updated",
      {
        storyId: storyId.toString(),
        viewsCount: story.viewsCount,
        uniqueViewersCount: story.uniqueViewersCount,
        completedViewsCount: story.completedViewsCount,
        likesCount: story.likesCount,
        repliesCount: story.repliesCount,
      }
    );
  } catch (error) {
    console.error("Analytics socket error:", error.message);
  }
};

/*
 * POST /api/stories/:storyId/view
 *
 * A StoryView document is unique for (story, viewer).
 * Therefore the same user can never create a duplicate
 * view record for the same story.
 */
export const recordStoryView = async (req, res) => {
  try {
    const { storyId } = req.params;
    const viewerId = req.user?._id;

    if (!viewerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid story ID",
      });
    }

    const story = await Story.findOne({
      _id: storyId,
      status: "active",
      expiresAt: { $gt: new Date() },
    }).select("user");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not available",
      });
    }

    // The owner is not counted as a viewer.
    if (story.user.toString() === viewerId.toString()) {
      return res.status(200).json({
        success: true,
        counted: false,
        unique: false,
      });
    }

    const mediaIndex = Math.max(
      0,
      Number(req.body?.mediaIndex ?? 0)
    );
    const completed = Boolean(req.body?.completed);
    const now = new Date();

    let view = await StoryView.findOne({
      story: storyId,
      viewer: viewerId,
    }).select("completedAt maxMediaIndex");

    let counted = false;
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

        counted = true;
        unique = true;
        completionAdded = completed;

        await Story.findByIdAndUpdate(storyId, {
          $inc: {
            viewsCount: 1,
            uniqueViewersCount: 1,
            ...(completed ? { completedViewsCount: 1 } : {}),
          },
        });
      } catch (error) {
        // Another request may have created the unique record first.
        if (error.code !== 11000) throw error;

        view = await StoryView.findOne({
          story: storyId,
          viewer: viewerId,
        }).select("completedAt maxMediaIndex");
      }
    }

    if (view && !unique) {
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
        {
          story: storyId,
          viewer: viewerId,
        },
        update
      );

      if (completionAdded) {
        await Story.findByIdAndUpdate(storyId, {
          $inc: { completedViewsCount: 1 },
        });
      }
    }

    await emitAnalyticsUpdate(storyId);

    return res.status(200).json({
      success: true,
      counted,
      unique,
      completionAdded,
    });
  } catch (error) {
    console.error("Record story view error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record story view",
    });
  }
};

/*
 * GET /api/stories/:storyId/analytics
 *
 * Only the story owner can access analytics.
 * This also works after expiration because archived stories
 * remain queryable.
 */
export const getStoryAnalytics = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await getOwnedStory(storyId, req.user?._id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    const storyObjectId = story._id;

    const [viewerStats, reactionStats, replyCount, timeline, viewers] =
      await Promise.all([
        StoryView.aggregate([
          { $match: { story: storyObjectId } },
          {
            $group: {
              _id: null,
              uniqueViewers: { $sum: 1 },
              completedViews: {
                $sum: {
                  $cond: [{ $ne: ["$completedAt", null] }, 1, 0],
                },
              },
            },
          },
        ]),

        StoryReaction.aggregate([
          { $match: { story: storyObjectId } },
          {
            $group: {
              _id: "$reaction",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),

        StoryReply.countDocuments({ story: storyObjectId }),

        StoryView.aggregate([
          { $match: { story: storyObjectId } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d %H:00",
                  date: "$firstViewedAt",
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
          .populate("viewer", "username fullName profilePicture")
          .lean(),
      ]);

    const uniqueViewers = viewerStats[0]?.uniqueViewers ?? 0;
    const completedViews = viewerStats[0]?.completedViews ?? 0;

    const completionRate =
      uniqueViewers === 0
        ? 0
        : Number(((completedViews / uniqueViewers) * 100).toFixed(2));

    return res.status(200).json({
      success: true,
      analytics: {
        storyId: story._id,
        status: story.status,
        totalViews: story.viewsCount,
        uniqueViewers,
        reactions: {
          total: story.likesCount,
          breakdown: reactionStats,
        },
        replies: {
          total: replyCount,
        },
        completedViews,
        completionRate,
        timeline,
        viewers,
      },
    });
  } catch (error) {
    console.error("Story analytics error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load analytics",
    });
  }
};