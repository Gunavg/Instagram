import Story from "../models/Story.model.js";
import StoryReaction from "../models/StoryReaction.model.js";
import { io } from "../socket.js";

const emitReactionAnalytics = async (storyId) => {
  const updatedStory = await Story.findById(storyId).select(
    "likesCount repliesCount viewsCount uniqueViewersCount completedViewsCount"
  );

  if (!updatedStory) return;

  io?.to(`story-analytics:${storyId}`).emit(
    "story-analytics-updated",
    {
      storyId: storyId.toString(),
      likesCount: updatedStory.likesCount,
      repliesCount: updatedStory.repliesCount,
      viewsCount: updatedStory.viewsCount,
      uniqueViewersCount: updatedStory.uniqueViewersCount,
      completedViewsCount: updatedStory.completedViewsCount,
    }
  );
};

export const reactToStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const reaction = req.body?.reaction || "like";
    const allowed = ["like", "love", "haha", "wow", "sad", "angry"];

    if (!allowed.includes(reaction)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reaction",
      });
    }

    const story = await Story.findOne({
      _id: storyId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not available",
      });
    }

    const existing = await StoryReaction.findOne({
      story: storyId,
      user: req.user._id,
    });

    if (existing) {
      existing.reaction = reaction;
      await existing.save();
    } else {
      await StoryReaction.create({
        story: storyId,
        user: req.user._id,
        reaction,
      });

      await Story.findByIdAndUpdate(storyId, {
        $inc: { likesCount: 1 },
      });
    }

    await emitReactionAnalytics(storyId);

    return res.status(200).json({
      success: true,
      reaction,
    });
  } catch (error) {
    console.error("Story reaction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to react to story",
    });
  }
};

export const removeStoryReaction = async (req, res) => {
  try {
    const { storyId } = req.params;

    const deleted = await StoryReaction.findOneAndDelete({
      story: storyId,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Reaction not found",
      });
    }

    await Story.findByIdAndUpdate(storyId, {
      $inc: { likesCount: -1 },
    });

    await emitReactionAnalytics(storyId);

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Remove story reaction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to remove reaction",
    });
  }
};