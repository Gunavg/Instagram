import mongoose from "mongoose";

import Story from "../models/Story.model.js";
import StoryView from "../models/StoryView.model.js";
import StoryReaction from "../models/StoryReaction.model.js";
import StoryReply from "../models/StoryReply.model.js";

import { canViewStory } from "./story.controller.js";
import { io } from "../socket.js";

/*
 * ============================================================
 * GET OWNED STORY
 * ============================================================
 *
 * Analytics can be viewed only by the Story owner.
 *
 * Active and archived Stories are allowed because
 * analytics must remain available after the Story expires.
 */
const getOwnedStory = async (
  storyId,
  userId
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      storyId
    )
  ) {
    return null;
  }

  if (!userId) {
    return null;
  }

  return Story.findOne({
    _id: storyId,
    user: userId,

    /*
     * Archived Stories must remain available
     * for historical analytics.
     */
    status: {
      $in: [
        "active",
        "archived",
      ],
    },
  }).select(
    [
      "user",
      "status",
      "expiresAt",
      "viewsCount",
      "uniqueViewersCount",
      "completedViewsCount",
      "likesCount",
      "repliesCount",
    ].join(" ")
  );
};

/*
 * ============================================================
 * EMIT REAL-TIME ANALYTICS UPDATE
 * ============================================================
 *
 * Sends updated counters to the Story owner's
 * analytics dashboard.
 */
const emitAnalyticsUpdate = async (
  storyId
) => {
  try {
    const story =
      await Story.findById(
        storyId
      ).select(
        [
          "viewsCount",
          "uniqueViewersCount",
          "completedViewsCount",
          "likesCount",
          "repliesCount",
        ].join(" ")
      );

    if (!story || !io) {
      return;
    }

    io.to(
      `story-analytics:${storyId}`
    ).emit(
      "story-analytics-updated",
      {
        storyId:
          storyId.toString(),

        viewsCount:
          story.viewsCount || 0,

        uniqueViewersCount:
          story.uniqueViewersCount || 0,

        completedViewsCount:
          story.completedViewsCount || 0,

        likesCount:
          story.likesCount || 0,

        repliesCount:
          story.repliesCount || 0,
      }
    );
  } catch (error) {
    /*
     * Socket errors should not break
     * the main Story-view operation.
     */
    console.error(
      "Analytics socket error:",
      error.message
    );
  }
};

/*
 * ============================================================
 * RECORD STORY VIEW
 * ============================================================
 *
 * POST /api/stories/:storyId/view
 *
 * Body:
 *
 * {
 *   mediaIndex: 0,
 *   completed: false
 * }
 *
 * IMPORTANT:
 *
 * StoryView has a unique compound index:
 *
 * {
 *   story: 1,
 *   viewer: 1
 * }
 *
 * Therefore a user can only have one
 * StoryView document for one Story.
 */
export const recordStoryView = async (
  req,
  res
) => {
  try {
    const { storyId } =
      req.params;

    const viewerId =
      req.user?._id;

    /*
     * --------------------------------------------------------
     * Authentication
     * --------------------------------------------------------
     */
    if (!viewerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /*
     * --------------------------------------------------------
     * Validate Story ID
     * --------------------------------------------------------
     */
    if (
      !mongoose.Types.ObjectId.isValid(
        storyId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid story ID",
      });
    }

    /*
     * --------------------------------------------------------
     * Find active, non-expired Story
     * --------------------------------------------------------
     *
     * New views cannot be recorded for archived
     * or expired Stories.
     */
    const story =
      await Story.findOne({
        _id: storyId,
        status: "active",
        expiresAt: {
          $gt: new Date(),
        },
      }).select(
        "user privacy"
      );

    if (!story) {
      return res.status(404).json({
        success: false,
        message:
          "Story not available",
      });
    }

    /*
     * --------------------------------------------------------
     * Story privacy validation
     * --------------------------------------------------------
     *
     * Uses the same privacy rules as the main
     * Story controller:
     *
     * public
     * followers
     * close_friends
     */
    const allowedToView =
      await canViewStory(
        story,
        viewerId
      );

    if (!allowedToView) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to view this story",
      });
    }

    /*
     * --------------------------------------------------------
     * Do not count Story owner's own views.
     * --------------------------------------------------------
     */
    if (
      story.user.toString() ===
      viewerId.toString()
    ) {
      return res.status(200).json({
        success: true,
        counted: false,
        unique: false,
        completionAdded: false,
      });
    }

    /*
     * --------------------------------------------------------
     * Media index
     * --------------------------------------------------------
     */
    const requestedMediaIndex =
      Number(
        req.body?.mediaIndex ?? 0
      );

    const mediaIndex =
      Number.isFinite(
        requestedMediaIndex
      )
        ? Math.max(
            0,
            Math.floor(
              requestedMediaIndex
            )
          )
        : 0;

    /*
     * --------------------------------------------------------
     * Completion
     * --------------------------------------------------------
     */
    const completed =
      req.body?.completed === true;

    const now =
      new Date();

    /*
     * --------------------------------------------------------
     * Find existing view
     * --------------------------------------------------------
     */
    let view =
      await StoryView.findOne({
        story: storyId,
        viewer: viewerId,
      }).select(
        "completedAt maxMediaIndex"
      );

    let counted = false;
    let unique = false;
    let completionAdded =
      false;

    /*
     * ========================================================
     * NEW VIEWER
     * ========================================================
     */
    if (!view) {
      try {
        /*
         * Create the unique StoryView.
         *
         * The unique index on:
         *
         * story + viewer
         *
         * protects against duplicate records.
         */
        view =
          await StoryView.create({
            story: storyId,
            viewer: viewerId,

            firstViewedAt:
              now,

            lastViewedAt:
              now,

            maxMediaIndex:
              mediaIndex,

            completedAt:
              completed
                ? now
                : null,
          });

        counted = true;
        unique = true;

        completionAdded =
          completed;

        /*
         * Update Story counters.
         */
        const increment = {
          viewsCount: 1,
          uniqueViewersCount: 1,
        };

        if (completed) {
          increment.completedViewsCount = 1;
        }

        await Story.findByIdAndUpdate(
          storyId,
          {
            $inc: increment,
          }
        );
      } catch (error) {
        /*
         * ====================================================
         * DUPLICATE REQUEST PROTECTION
         * ====================================================
         *
         * If two requests arrive at almost exactly
         * the same time, both may initially find no
         * StoryView.
         *
         * MongoDB's unique index allows only one
         * insert to succeed.
         *
         * The second request receives error 11000.
         */
        if (
          error?.code !== 11000
        ) {
          throw error;
        }

        /*
         * The other request successfully
         * created the view.
         */
        view =
          await StoryView.findOne({
            story: storyId,
            viewer: viewerId,
          }).select(
            "completedAt maxMediaIndex"
          );
      }
    }

    /*
     * ========================================================
     * EXISTING VIEWER
     * ========================================================
     *
     * Do NOT increment:
     *
     * viewsCount
     * uniqueViewersCount
     *
     * because this viewer was already counted.
     */
    if (
      view &&
      !unique
    ) {
      const wasCompleted =
        Boolean(
          view.completedAt
        );

      /*
       * Update latest viewing information.
       */
      const update = {
        $set: {
          lastViewedAt:
            now,
        },

        /*
         * Keep the highest media index
         * reached by the viewer.
         */
        $max: {
          maxMediaIndex:
            mediaIndex,
        },
      };

      /*
       * ------------------------------------------------------
       * Completion
       * ------------------------------------------------------
       *
       * A viewer can become completed only once.
       */
      if (
        completed &&
        !wasCompleted
      ) {
        update.$set.completedAt =
          now;

        completionAdded =
          true;
      }

      await StoryView.updateOne(
        {
          story: storyId,
          viewer: viewerId,
        },
        update
      );

      /*
       * Increment completedViewsCount
       * only once.
       */
      if (
        completionAdded
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

    /*
     * --------------------------------------------------------
     * Real-time analytics
     * --------------------------------------------------------
     */
    await emitAnalyticsUpdate(
      storyId
    );

    return res.status(200).json({
      success: true,
      counted,
      unique,
      completionAdded,
    });
  } catch (error) {
    console.error(
      "Record story view error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to record story view",
    });
  }
};

/*
 * ============================================================
 * GET STORY ANALYTICS
 * ============================================================
 *
 * GET /api/stories/:storyId/analytics
 *
 * Only the Story owner can access analytics.
 *
 * Archived Stories are supported.
 */
export const getStoryAnalytics = async (
  req,
  res
) => {
  try {
    const { storyId } =
      req.params;

    const userId =
      req.user?._id;

    /*
     * Authentication.
     */
    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized",
      });
    }

    /*
     * Only Story owner can view
     * analytics.
     */
    const story =
      await getOwnedStory(
        storyId,
        userId
      );

    if (!story) {
      return res.status(404).json({
        success: false,
        message:
          "Story not found",
      });
    }

    const storyObjectId =
      story._id;

    /*
     * ========================================================
     * Run independent analytics queries in parallel.
     * ========================================================
     *
     * Main counters are read from Story.
     *
     * Detailed information comes from:
     * StoryReaction
     * StoryReply
     * StoryView
     */
    const [
      reactionStats,
      replyCount,
      timeline,
      viewers,
    ] = await Promise.all([
      /*
       * ------------------------------------------------------
       * Reaction breakdown
       * ------------------------------------------------------
       */
      StoryReaction.aggregate([
        {
          $match: {
            story:
              storyObjectId,
          },
        },

        {
          $group: {
            _id:
              "$reaction",

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

      /*
       * ------------------------------------------------------
       * Reply count
       * ------------------------------------------------------
       */
      StoryReply.countDocuments({
        story:
          storyObjectId,
      }),

      /*
       * ------------------------------------------------------
       * Hourly view timeline
       * ------------------------------------------------------
       *
       * Uses firstViewedAt because each user has
       * one StoryView document.
       */
      StoryView.aggregate([
        {
          $match: {
            story:
              storyObjectId,
          },
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  "%Y-%m-%d %H:00",

                date:
                  "$firstViewedAt",
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

      /*
       * ------------------------------------------------------
       * Viewer list
       * ------------------------------------------------------
       *
       * Initially return 500 viewers maximum.
       *
       * The StoryView indexes support:
       *
       * story + lastViewedAt
       */
      StoryView.find({
        story:
          storyObjectId,
      })
        .sort({
          firstViewedAt: -1,
        })
        .limit(500)
        .populate(
          "viewer",
          "_id username fullName profilePicture"
        )
        .lean(),
    ]);

    /*
     * ========================================================
     * Main counters
     * ========================================================
     *
     * Use counters stored directly in Story.
     *
     * This avoids recalculating the basic totals
     * by scanning all StoryView records.
     */
    const totalViews =
      story.viewsCount || 0;

    const uniqueViewers =
      story.uniqueViewersCount || 0;

    const completedViews =
      story.completedViewsCount || 0;

    const totalReactions =
      story.likesCount || 0;

    /*
     * ========================================================
     * Completion rate
     * ========================================================
     *
     * Completion Rate =
     *
     * completed viewers /
     * unique viewers × 100
     */
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

    /*
     * ========================================================
     * Return analytics
     * ========================================================
     */
    return res.status(200).json({
      success: true,

      analytics: {
        storyId:
          story._id,

        status:
          story.status,

        totalViews,

        uniqueViewers,

        reactions: {
          total:
            totalReactions,

          breakdown:
            reactionStats,
        },

        replies: {
          /*
           * Use the Story counter when
           * available, while keeping the
           * database count as fallback.
           */
          total:
            story.repliesCount ??
            replyCount,
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
      message:
        error.message ||
        "Failed to load analytics",
    });
  }
};
