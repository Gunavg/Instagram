import mongoose from "mongoose";

import Story from "../models/Story.model.js";
import StoryView from "../models/StoryView.model.js";
import StoryReaction from "../models/StoryReaction.model.js";
import StoryReply from "../models/StoryReply.model.js";

import { io } from "../socket.js";

/*
 * Check story ownership.
 */
const getOwnedStory = async (storyId, userId) => {
  return Story.findOne({
    _id: storyId,
    user: userId,
    status: {
      $in: ["active", "archived"],
    },
  });
};

/*
 * Emit real-time analytics update.
 */
const emitAnalyticsUpdate = async (storyId) => {
  try {
    const story = await Story.findById(storyId).select(
      "viewsCount uniqueViewersCount completedViewsCount likesCount repliesCount"
    );

    if (!story || !io) {
      return;
    }

    io.to(`story-analytics:${storyId}`).emit(
      "story-analytics-updated",
      {
        storyId,
        viewsCount: story.viewsCount,
        uniqueViewersCount:
          story.uniqueViewersCount,
        completedViewsCount:
          story.completedViewsCount,
        likesCount: story.likesCount,
        repliesCount: story.repliesCount,
      }
    );
  } catch (error) {
    console.error(
      "Analytics socket error:",
      error.message
    );
  }
};

/*
 * RECORD STORY VIEW
 *
 * POST /api/stories/:storyId/view
 */
export const recordStoryView = async (req, res) => {
  try {
    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid story ID",
      });
    }

    const story = await Story.findOne({
      _id: storyId,
      status: "active",
      expiresAt: {
        $gt: new Date(),
      },
    }).select("user");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not available",
      });
    }

    if (
      story.user.toString() ===
      req.user._id.toString()
    ) {
      return res.status(200).json({
        success: true,
        counted: false,
      });
    }

    const mediaIndex = Math.max(
      0,
      Number(req.body?.mediaIndex || 0)
    );

    const completed = Boolean(
      req.body?.completed
    );

    const now = new Date();

    /*
     * Try to create the unique view record.
     */
    let created = false;
    let view;

    try {
      view = await StoryView.create({
        story: storyId,
        viewer: req.user._id,
        firstViewedAt: now,
        lastViewedAt: now,
        maxMediaIndex: mediaIndex,
        completedAt: completed ? now : null,
      });

      await Story.findByIdAndUpdate(
        storyId,
        {
          $inc: {
            viewsCount: 1,
            uniqueViewersCount: 1,
            ...(completed
              ? {
                  completedViewsCount: 1,
                }
              : {}),
          },
        }
      );
      await emitAnalyticsUpdate(storyId);

      return res.status(200).json({
        success: true,
        counted: true,
        unique: true,
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      /*
       * Duplicate key means this user has already
       * viewed this story.
       *
       * Do NOT create another view record.
       */
      if (error.code === 11000) {
        view = await StoryView.findOneAndUpdate(
          {
            story: storyId,
            viewer: req.user._id,
          },
          {
            $set: {
              lastViewedAt: now,
            },
            $max: {
              maxMediaIndex: mediaIndex,
            },
            ...(completed
              ? {
                  $set: {
                    lastViewedAt: now,
                    completedAt: now,
                  },
                }
              : {}),
          },
          {
            new: true,
          }
        );
      } else {
        throw error;
      }
    }

    /*
     * Increment total views for every view event.
     *
     * A unique view record is created only once.
     *
     * If you want "views" to mean unique views,
     * use uniqueViewersCount.
     */
    if (created) {
      await Story.findByIdAndUpdate(
        storyId,
        {
          $inc: {
            viewsCount: 1,
            uniqueViewersCount: 1,
            ...(completed
              ? {
                  completedViewsCount: 1,
                }
              : {}),
          },
        }
      );
    } else if (
      completed &&
      view &&
      view.completedAt
    ) {
      /*
       * Only increment completion when this
       * existing viewer was not already completed.
       */
      const previous = await StoryView.findOne({
        story: storyId,
        viewer: req.user._id,
      }).select("completedAt");

      if (
        previous &&
        previous.completedAt === null
      ) {
        await Story.findByIdAndUpdate(
          storyId,
          {
            $inc: {
              completedViewsCount: 1,
            },
          }
        );
      }
    }
    const existingView =
        await StoryView.findOne({
          story: storyId,
          viewer: req.user._id,
        }).select("completedAt");

      const wasCompleted =
        Boolean(existingView?.completedAt);

      const update = {
        $set: {
          lastViewedAt: now,
        },
        $max: {
          maxMediaIndex: mediaIndex,
        },
      };

      if (
        completed &&
        !wasCompleted
      ) {
        update.$set.completedAt = now;
      }

      await StoryView.updateOne(
        {
          story: storyId,
          viewer: req.user._id,
        },
        update
      );

      if (
        completed &&
        !wasCompleted
      ) {
        await Story.findByIdAndUpdate(
          storyId,
          {
            $inc: {
              completedViewsCount: 1,
            },
          }
        );
      }

    await emitAnalyticsUpdate(storyId);

    return res.status(200).json({
      success: true,
        counted: false,
        unique: false,
    });
  } catch (error) {
    console.error(
      "Record story view error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getStoryAnalytics = async (
  req,
  res
) => {
  try {
    const { storyId } = req.params;

    const story = await getOwnedStory(
      storyId,
      req.user._id
    );

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    const [
      viewerStats,
      reactionStats,
      replyCount,
      timeline,
      viewers,
    ] = await Promise.all([
      StoryView.aggregate([
        {
          $match: {
            story: story._id,
          },
        },
        {
          $group: {
            _id: null,
            uniqueViewers: {
              $sum: 1,
            },
            completedViews: {
              $sum: {
                $cond: [
                  {
                    $ne: [
                      "$completedAt",
                      null,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      StoryReaction.aggregate([
        {
          $match: {
            story: story._id,
          },
        },
        {
          $group: {
            _id: "$reaction",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),

      StoryReply.countDocuments({
        story: story._id,
      }),

      StoryView.aggregate([
        {
          $match: {
            story: story._id,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d %H:00",
                date: "$firstViewedAt",
              },
            },
            views: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      StoryView.find({
        story: story._id,
      })
        .sort({
          firstViewedAt: -1,
        })
        .limit(500)
        .populate(
          "viewer",
          "username fullName profilePicture"
        )
        .lean(),
    ]);

    const uniqueViewers =
      viewerStats[0]?.uniqueViewers || 0;

    const completedViews =
      viewerStats[0]?.completedViews || 0;

    const completionRate =
      uniqueViewers === 0
        ? 0
        : Number(
            (
              (completedViews /
                uniqueViewers) *
              100
            ).toFixed(2)
          );

    return res.status(200).json({
      success: true,

      analytics: {
        storyId: story._id,

        totalViews:
          story.viewsCount,

        uniqueViewers,

        reactions: {
          total:
            story.likesCount,
          breakdown:
            reactionStats,
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
    console.error(
      "Story analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};