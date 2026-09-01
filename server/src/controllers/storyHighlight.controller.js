import mongoose from "mongoose";

import Story from "../models/Story.model.js";
import StoryView from "../models/StoryView.model.js";
import StoryViewEvent from "../models/StoryViewEvent.model.js";
import StoryHighlight from "../models/StoryHighlight.model.js";

/*
 * ============================================================
 * CREATE HIGHLIGHT
 * ============================================================
 */
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

    if (title.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: "Highlight title cannot exceed 50 characters",
      });
    }

    if (!Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one story",
      });
    }

    const uniqueStoryIds = [
      ...new Set(storyIds.map((id) => id?.toString())),
    ];

    const invalidIds = uniqueStoryIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more story IDs are invalid",
      });
    }

    const stories = await Story.find({
      _id: { $in: uniqueStoryIds },
      user: req.user._id,
      status: { $in: ["active", "archived"] },
    }).select("_id media createdAt expiresAt status viewsCount uniqueViewersCount");

    if (stories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid stories selected",
      });
    }

    const highlight = await StoryHighlight.create({
      owner: req.user._id,
      title: title.trim(),
      coverUrl: coverUrl?.trim() || "",
      stories: stories.map((story) => story._id),
    });

    const populated = await StoryHighlight.findById(highlight._id)
      .populate("stories")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Highlight created successfully",
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

/*
 * ============================================================
 * GET MY HIGHLIGHTS
 * ============================================================
 */
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

/*
 * ============================================================
 * GET SINGLE HIGHLIGHT
 * ============================================================
 */
export const getHighlightById = async (req, res) => {
  try {
    const { highlightId } = req.params;

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid highlight ID",
      });
    }

    const highlight = await StoryHighlight.findOne({
      _id: highlightId,
      owner: req.user._id,
    })
      .populate("stories")
      .lean();

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Highlight not found",
      });
    }

    return res.status(200).json({
      success: true,
      highlight,
    });
  } catch (error) {
    console.error("Get highlight error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch highlight",
    });
  }
};

/*
 * ============================================================
 * GET HIGHLIGHT ANALYTICS
 * ============================================================
 *
 * GET /api/story-highlights/:highlightId/analytics
 *
 * Total views are the sum of actual viewing sessions for all
 * Stories in the Highlight.
 *
 * Unique viewers are calculated across the complete Highlight,
 * so the same viewer is counted only once even if they watched
 * multiple Stories inside it.
 */
export const getHighlightAnalytics = async (req, res) => {
  try {
    const { highlightId } = req.params;
    const ownerId = req.user?._id;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid highlight ID",
      });
    }

    const highlight = await StoryHighlight.findOne({
      _id: highlightId,
      owner: ownerId,
    })
      .select("_id title stories")
      .lean();

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Highlight not found",
      });
    }

    const storyIds = highlight.stories || [];

    if (storyIds.length === 0) {
      return res.status(200).json({
        success: true,
        analytics: {
          highlightId,
          title: highlight.title,
          totalViews: 0,
          uniqueViewers: 0,
          stories: [],
        },
      });
    }

    const [storyStats, uniqueViewerStats] = await Promise.all([
      StoryViewEvent.aggregate([
        {
          $match: {
            story: { $in: storyIds },
          },
        },
        {
          $group: {
            _id: "$story",
            totalViews: { $sum: 1 },
          },
        },
      ]),

      StoryView.aggregate([
        {
          $match: {
            story: { $in: storyIds },
          },
        },
        {
          $group: {
            _id: "$viewer",
          },
        },
        {
          $count: "count",
        },
      ]),
    ]);

    const storyStatsMap = new Map(
      storyStats.map((item) => [
        item._id.toString(),
        item.totalViews,
      ])
    );

    const totalViews = storyStats.reduce(
      (sum, item) => sum + item.totalViews,
      0
    );

    const uniqueViewers = uniqueViewerStats[0]?.count || 0;

    const stories = storyIds.map((storyId) => ({
      storyId: storyId.toString(),
      views: storyStatsMap.get(storyId.toString()) || 0,
    }));

    return res.status(200).json({
      success: true,
      analytics: {
        highlightId: highlight._id,
        title: highlight.title,
        totalViews,
        uniqueViewers,
        stories,
      },
    });
  } catch (error) {
    console.error("Get highlight analytics error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get highlight analytics",
    });
  }
};

/*
 * ============================================================
 * ADD STORY TO HIGHLIGHT
 * ============================================================
 */
export const addStoryToHighlight = async (req, res) => {
  try {
    const { highlightId, storyId } = req.params;

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid highlight ID",
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
      user: req.user._id,
      status: { $in: ["active", "archived"] },
    }).select("_id");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

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
      {
        _id: highlightId,
        owner: req.user._id,
      },
      {
        $addToSet: {
          stories: storyId,
        },
      }
    );

    const updated = await StoryHighlight.findById(highlightId)
      .populate("stories")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Story added to highlight",
      highlight: updated,
    });
  } catch (error) {
    console.error("Add story to highlight error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update highlight",
    });
  }
};

/*
 * ============================================================
 * REMOVE STORY FROM HIGHLIGHT
 * ============================================================
 */
export const removeStoryFromHighlight = async (req, res) => {
  try {
    const { highlightId, storyId } = req.params;

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid highlight ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid story ID",
      });
    }

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

    highlight.stories = highlight.stories.filter(
      (id) => id.toString() !== storyId.toString()
    );

    if (highlight.stories.length === 0) {
      await StoryHighlight.deleteOne({
        _id: highlightId,
        owner: req.user._id,
      });

      return res.status(200).json({
        success: true,
        message: "Story removed and empty highlight deleted",
        deleted: true,
      });
    }

    await highlight.save();

    const updated = await StoryHighlight.findById(highlightId)
      .populate("stories")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Story removed from highlight",
      highlight: updated,
      deleted: false,
    });
  } catch (error) {
    console.error("Remove story from highlight error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to remove story",
    });
  }
};

/*
 * ============================================================
 * DELETE HIGHLIGHT
 * ============================================================
 */
export const deleteHighlight = async (req, res) => {
  try {
    const { highlightId } = req.params;

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid highlight ID",
      });
    }

    const deleted = await StoryHighlight.findOneAndDelete({
      _id: highlightId,
      owner: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Highlight not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Highlight deleted successfully",
    });
  } catch (error) {
    console.error("Delete highlight error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete highlight",
    });
  }
};