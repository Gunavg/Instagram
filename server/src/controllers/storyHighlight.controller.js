import mongoose from "mongoose";
import Story from "../models/Story.model.js";
import StoryHighlight from "../models/StoryHighlight.model.js";

export const createHighlight = async (req, res) => {
  try {
    const { title, storyIds, coverUrl } = req.body;

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Highlight title is required",
      });
    }

    if (!Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one story",
      });
    }

    const validStoryIds = storyIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    const stories = await Story.find({
      _id: { $in: validStoryIds },
      user: req.user._id,
      status: { $in: ["active", "archived"] },
    }).select("_id");

    if (stories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid stories selected",
      });
    }

    const highlight = await StoryHighlight.create({
      owner: req.user._id,
      title: title.trim(),
      coverUrl: coverUrl || "",
      stories: stories.map((story) => story._id),
    });

    const populated = await StoryHighlight.findById(highlight._id).populate(
      "stories"
    );

    return res.status(201).json({
      success: true,
      highlight: populated,
    });
  } catch (error) {
    console.error("Create highlight error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create highlight",
    });
  }
};

export const getMyHighlights = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const highlights = await StoryHighlight.find({
      owner: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate("stories")
      .lean();

    return res.status(200).json({
      success: true,
      highlights,
    });
  } catch (error) {
    console.error("Get highlights error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch highlights",
    });
  }
};

export const addStoryToHighlight = async (req, res) => {
  try {
    const { highlightId, storyId } = req.params;

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const story = await Story.findOne({
      _id: storyId,
      user: req.user._id,
      status: { $in: ["active", "archived"] },
    }).select("_id");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // IMPORTANT: search StoryHighlight, not Story.
    const highlight = await StoryHighlight.findOne({
      _id: highlightId,
      owner: req.user._id,
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Highlight not found",
      });
    }

    await StoryHighlight.updateOne(
      { _id: highlightId, owner: req.user._id },
      { $addToSet: { stories: storyId } }
    );

    return res.status(200).json({
      success: true,
      message: "Story added to highlight",
    });
  } catch (error) {
    console.error("Add story to highlight error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update highlight",
    });
  }
};