import Story from "../models/Story.model.js";
import StoryReaction from "../models/StoryReaction.model.js";

import {
  canViewStory,
} from "./story.controller.js";

import { io } from "../socket.js";

/*
 * Emit updated analytics.
 */
const emitReactionAnalytics =
  async (storyId) => {
    try {
      const story =
        await Story.findById(
          storyId
        ).select(
          "likesCount repliesCount viewsCount uniqueViewersCount completedViewsCount"
        );

      if (
        !story ||
        !io
      ) {
        return;
      }

      io.to(
        `story-analytics:${storyId}`
      ).emit(
        "story-analytics-updated",
        {
          storyId:
            storyId.toString(),

          likesCount:
            story.likesCount ||
            0,

          repliesCount:
            story.repliesCount ||
            0,

          viewsCount:
            story.viewsCount ||
            0,

          uniqueViewersCount:
            story.uniqueViewersCount ||
            0,

          completedViewsCount:
            story.completedViewsCount ||
            0,
        }
      );
    } catch (error) {
      console.error(
        "Reaction analytics socket error:",
        error.message
      );
    }
  };

/*
 * ============================================================
 * REACT TO STORY
 * ============================================================
 *
 * POST /api/stories/:storyId/reaction
 */
export const reactToStory =
  async (
    req,
    res
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      const {
        storyId,
      } = req.params;

      const reaction =
        req.body?.reaction ||
        "like";

      const allowed = [
        "like",
        "love",
        "haha",
        "wow",
        "sad",
        "angry",
      ];

      if (
        !allowed.includes(
          reaction
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid reaction",
        });
      }

      /*
       * Only active, non-expired
       * Stories can receive reactions.
       */
      const story =
        await Story.findOne({
          _id:
            storyId,

          status:
            "active",

          expiresAt: {
            $gt:
              new Date(),
          },
        });

      if (!story) {
        return res.status(404).json({
          success: false,
          message:
            "Story not available",
        });
      }

      /*
       * Check Story privacy.
       */
      const allowedToView =
        await canViewStory(
          story,
          req.user._id
        );

      if (
        !allowedToView
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to interact with this story",
        });
      }

      /*
       * Check existing reaction.
       */
      const existing =
        await StoryReaction.findOne({
          story:
            storyId,

          user:
            req.user._id,
        });

      if (existing) {
        /*
         * Change existing reaction.
         *
         * Count does not increase.
         */
        existing.reaction =
          reaction;

        await existing.save();
      } else {
        /*
         * New reaction.
         */
        await StoryReaction.create({
          story:
            storyId,

          user:
            req.user._id,

          reaction,
        });

        /*
         * Increase reaction count.
         */
        await Story.findByIdAndUpdate(
          storyId,
          {
            $inc: {
              likesCount:
                1,
            },
          }
        );
      }

      /*
       * Real-time analytics.
       */
      await emitReactionAnalytics(
        storyId
      );

      return res.status(200).json({
        success: true,
        reaction,
      });
    } catch (error) {
      console.error(
        "Story reaction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to react to story",
      });
    }
  };

/*
 * ============================================================
 * REMOVE STORY REACTION
 * ============================================================
 *
 * DELETE /api/stories/:storyId/reaction
 */
export const removeStoryReaction =
  async (
    req,
    res
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      const {
        storyId,
      } = req.params;

      const story =
        await Story.findOne({
          _id:
            storyId,

          status:
            "active",

          expiresAt: {
            $gt:
              new Date(),
          },
        });

      if (!story) {
        return res.status(404).json({
          success: false,
          message:
            "Story not available",
        });
      }

      /*
       * Check privacy.
       */
      const allowedToView =
        await canViewStory(
          story,
          req.user._id
        );

      if (
        !allowedToView
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to interact with this story",
        });
      }

      /*
       * Delete reaction.
       *
       * Removal is intentionally idempotent. The viewer can
       * move between stories while it is open, so the UI may
       * occasionally request a removal after the reaction for
       * that story has already been removed. In that case the
       * desired final state is already achieved, so return 200
       * instead of treating it as an application error.
       */
      const deleted =
        await StoryReaction.findOneAndDelete(
          {
            story:
              storyId,

            user:
              req.user._id,
          }
        );

      if (!deleted) {
        return res.status(200).json({
          success: true,
          message:
            "Reaction already removed",
          removed: false,
        });
      }

      /*
       * Decrease counter only if
       * there is a reaction to remove.
       */
      await Story.findOneAndUpdate(
        {
          _id:
            storyId,

          likesCount: {
            $gt:
              0,
          },
        },
        {
          $inc: {
            likesCount:
              -1,
          },
        }
      );

      /*
       * Real-time analytics.
       */
      await emitReactionAnalytics(
        storyId
      );

      return res.status(200).json({
        success: true,
        message:
          "Reaction removed",
        removed: true,
      });
    } catch (error) {
      console.error(
        "Remove story reaction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to remove reaction",
      });
    }
  };