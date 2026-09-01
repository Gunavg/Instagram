import Story from "../models/Story.model.js";
import StoryReply from "../models/StoryReply.model.js";
import { canViewStory } from "./story.controller.js";
import { io } from "../socket.js";

/*
 * REPLY TO STORY
 *
 * POST /api/stories/:storyId/reply
 */
export const replyToStory = async (
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
     * Get reply text.
     */
    const text = req.body?.text?.trim();

    /*
     * Empty reply validation.
     */
    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot be empty",
      });
    }

    /*
     * Maximum reply length.
     */
    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        message:
          "Reply cannot exceed 500 characters",
      });
    }

    /*
     * Find active, non-expired Story.
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
     * the user to reply.
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
     * Create reply.
     */
    const reply = await StoryReply.create({
      story: storyId,
      user: req.user._id,
      text,
    });

    /*
     * Increase reply count.
     */
    const updatedStory =
      await Story.findByIdAndUpdate(
        storyId,
        {
          $inc: {
            repliesCount: 1,
          },
        },
        {
          new: true,
        }
      ).select(
        "likesCount repliesCount viewsCount uniqueViewersCount completedViewsCount"
      );

    /*
     * Populate reply user information.
     */
    const populated =
      await StoryReply.findById(
        reply._id
      ).populate(
        "user",
        "username fullName profilePicture"
      );

    /*
     * Send real-time analytics update.
     */
    io?.to(`story-analytics:${storyId}`).emit(
      "story-analytics-updated",
      {
        storyId: storyId.toString(),

        likesCount:
          updatedStory?.likesCount || 0,

        repliesCount:
          updatedStory?.repliesCount || 0,

        viewsCount:
          updatedStory?.viewsCount || 0,

        uniqueViewersCount:
          updatedStory?.uniqueViewersCount || 0,

        completedViewsCount:
          updatedStory?.completedViewsCount || 0,
      }
    );

    return res.status(201).json({
      success: true,
      reply: populated,
    });
  } catch (error) {
    console.error(
      "Story reply error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to reply to story",
    });
  }
};
