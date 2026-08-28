import Story from "../models/Story.model.js";
import StoryReply from "../models/StoryReply.model.js";
import { io } from "../socket.js";

export const replyToStory = async (
  req,
  res
) => {
  try {
    const { storyId } = req.params;
    const text = req.body?.text?.trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot be empty",
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        message:
          "Reply cannot exceed 500 characters",
      });
    }

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

    const reply = await StoryReply.create({
      story: storyId,
      user: req.user._id,
      text,
    });

    await Story.findByIdAndUpdate(
      storyId,
      {
        $inc: {
          repliesCount: 1,
        },
      }
    );

    const populated =
      await StoryReply.findById(
        reply._id
      ).populate(
        "user",
        "username fullName profilePicture"
      );

    io?.to(`story-analytics:${storyId}`).emit(
      "story-analytics-updated",
      {
        storyId,
        repliesCount:
          story.repliesCount + 1,
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
      message: error.message,
    });
  }
};