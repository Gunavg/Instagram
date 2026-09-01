import Story from "../models/Story.model.js";
import StoryReaction from "../models/StoryReaction.model.js";
import { canViewStory } from "./story.controller.js";
import { io } from "../socket.js";

/*
 * Emit updated Story analytics to the
 * Story Analytics dashboard.
 */
const emitReactionAnalytics = async (storyId) => {
  try {
    const updatedStory = await Story.findById(
      storyId
    ).select(
      "likesCount repliesCount viewsCount uniqueViewersCount completedViewsCount"
    );

    if (!updatedStory || !io) {
      return;
    }

    io.to(
      `story-analytics:${storyId}`
    ).emit(
      "story-analytics-updated",
      {
        storyId: storyId.toString(),

        likesCount:
          updatedStory.likesCount,

        repliesCount:
          updatedStory.repliesCount,

        viewsCount:
          updatedStory.viewsCount,

        uniqueViewersCount:
          updatedStory.uniqueViewersCount,

        completedViewsCount:
          updatedStory.completedViewsCount,
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
 * REACT TO STORY
 *
 * POST /api/stories/:storyId/reaction
 */
export const reactToStory = async (
  req,
  res
) => {
  try {
    /*
     * Authentication check.
     */
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { storyId } = req.params;

    /*
     * Default reaction.
     */
    const reaction =
      req.body?.reaction || "like";

    /*
     * Supported reaction types.
     */
    const allowed = [
      "like",
      "love",
      "haha",
      "wow",
      "sad",
      "angry",
    ];

    if (!allowed.includes(reaction)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reaction",
      });
    }

    /*
     * Find active and non-expired Story.
     */
    const story = await Story.findOne({
      _id: storyId,
      status: "active",
      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not available",
      });
    }

    /*
     * Check Story privacy.
     *
     * Public:
     *    Everybody can react.
     *
     * Followers:
     *    Only followers can react.
     *
     * Close Friends:
     *    Only close friends can react.
     *
     * Owner:
     *    Owner can access their own Story.
     */
    const allowedToView =
      await canViewStory(
        story,
        req.user._id
      );

    if (!allowedToView) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to interact with this story",
      });
    }

    /*
     * Check if the user already has
     * a reaction for this Story.
     */
    const existing =
      await StoryReaction.findOne({
        story: storyId,
        user: req.user._id,
      });

    if (existing) {
      /*
       * User already reacted.
       *
       * Changing from:
       * like -> love
       *
       * should NOT increase likesCount.
       */
      existing.reaction = reaction;

      await existing.save();
    } else {
      /*
       * Create a new reaction.
       */
      await StoryReaction.create({
        story: storyId,
        user: req.user._id,
        reaction,
      });

      /*
       * Increase total reaction count.
       */
      await Story.findByIdAndUpdate(
        storyId,
        {
          $inc: {
            likesCount: 1,
          },
        }
      );
    }

    /*
     * Emit real-time analytics update.
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
 * REMOVE STORY REACTION
 *
 * DELETE /api/stories/:storyId/reaction
 */
export const removeStoryReaction = async (
  req,
  res
) => {
  try {
    /*
     * Authentication check.
     */
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { storyId } = req.params;

    /*
     * Find active Story.
     */
    const story = await Story.findOne({
      _id: storyId,
      status: "active",
      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not available",
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

    if (!allowedToView) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to interact with this story",
      });
    }

    /*
     * Remove the user's reaction.
     */
    const deleted =
      await StoryReaction.findOneAndDelete({
        story: storyId,
        user: req.user._id,
      });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Reaction not found",
      });
    }

    /*
     * Decrease reaction count.
     *
     * Only decrease if a reaction was
     * actually deleted.
     */
    await Story.findOneAndUpdate(
      {
        _id: storyId,
        likesCount: {
          $gt: 0,
        },
      },
      {
        $inc: {
          likesCount: -1,
        },
      }
    );

    /*
     * Emit real-time analytics update.
     */
    await emitReactionAnalytics(
      storyId
    );

    return res.status(200).json({
      success: true,
      message: "Reaction removed",
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
