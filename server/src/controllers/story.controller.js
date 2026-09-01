import Story from "../models/Story.model.js";
import StoryReaction from "../models/StoryReaction.model.js";
import { canViewStory } from "./story.controller.js";
import { io } from "../socket.js";

/*
 * Emit updated Story analytics to the Story owner.
 */
const emitReactionAnalytics = async (storyId) => {
  const updatedStory = await Story.findById(storyId).select(
    "likesCount repliesCount viewsCount uniqueViewersCount completedViewsCount"
  );

  if (!updatedStory) {
    return;
  }

  io?.to(`story-analytics:${storyId}`).emit(
    "story-analytics-updated",
    {
      storyId: storyId.toString(),
      likesCount: updatedStory.likesCount,
      repliesCount: updatedStory.repliesCount,
      viewsCount: updatedStory.viewsCount,
      uniqueViewersCount:
        updatedStory.uniqueViewersCount,
      completedViewsCount:
        updatedStory.completedViewsCount,
    }
  );
};

/*
 * REACT TO STORY
 *
 * POST /api/stories/:storyId/reaction
 */
export const reactToStory = async (req, res) => {
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

    const reaction =
      req.body?.reaction || "like";

    /*
     * Allowed reaction types.
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
     * Find only an active, non-expired Story.
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
     * IMPORTANT:
     * Check Story privacy before allowing
     * the user to react.
     *
     * This supports:
     * - Public
     * - Followers Only
     * - Close Friends
     */
    const allowedToView = await canViewStory(
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
     * Check whether this user already reacted.
     */
    const existing =
      await StoryReaction.findOne({
        story: storyId,
        user: req.user._id,
      });

    if (existing) {
      /*
       * User already has a reaction.
       *
       * Changing the reaction does NOT increase
       * the total reaction count.
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
     * Send real-time analytics update.
     */
    await emitReactionAnalytics(storyId);

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
     * Find the Story first.
     *
     * We check that it is still active and
     * non-expired before modifying the reaction.
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
    const allowedToView = await canViewStory(
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
     * Find and delete the user's reaction.
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
     * $max prevents the value from becoming
     * negative if old data is inconsistent.
     */
    await Story.findByIdAndUpdate(
      storyId,
      {
        $inc: {
          likesCount: -1,
        },
      }
    );

    /*
     * Send real-time analytics update.
     */
    await emitReactionAnalytics(storyId);

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

