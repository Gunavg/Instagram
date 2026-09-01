import mongoose from "mongoose";

import Story from "../models/Story.model.js";
import StoryHighlight from "../models/StoryHighlight.model.js";

/*
 * ============================================================
 * CREATE HIGHLIGHT
 * ============================================================
 *
 * POST /api/story-highlights
 *
 * Body:
 * {
 *   title: "Travel",
 *   storyIds: ["...", "..."],
 *   coverUrl: "..."
 * }
 */
export const createHighlight = async (
  req,
  res
) => {
  try {
    const {
      title,
      storyIds,
      coverUrl,
    } = req.body;

    /*
     * Authentication.
     */
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized",
      });
    }

    /*
     * Validate title.
     */
    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Highlight title is required",
      });
    }

    /*
     * Validate title length.
     */
    if (
      title.trim().length >
      50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Highlight title cannot exceed 50 characters",
      });
    }

    /*
     * Validate Stories.
     */
    if (
      !Array.isArray(
        storyIds
      ) ||
      storyIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Select at least one story",
      });
    }

    /*
     * Remove duplicate Story IDs.
     */
    const uniqueStoryIds =
      [
        ...new Set(
          storyIds.map(
            (id) =>
              id?.toString()
          )
        ),
      ];

    /*
     * Validate ObjectIds.
     */
    const invalidIds =
      uniqueStoryIds.filter(
        (id) =>
          !mongoose.Types.ObjectId.isValid(
            id
          )
      );

    if (
      invalidIds.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "One or more story IDs are invalid",
      });
    }

    /*
     * Only Stories belonging to the
     * logged-in user can be added.
     *
     * Both active and archived Stories
     * are allowed.
     *
     * Deleted Stories are excluded.
     */
    const stories =
      await Story.find({
        _id: {
          $in:
            uniqueStoryIds,
        },

        user:
          req.user._id,

        status: {
          $in: [
            "active",
            "archived",
          ],
        },
      }).select(
        "_id media createdAt expiresAt status"
      );

    if (
      stories.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No valid stories selected",
      });
    }

    /*
     * Create Highlight.
     */
    const highlight =
      await StoryHighlight.create({
        owner:
          req.user._id,

        title:
          title.trim(),

        coverUrl:
          coverUrl?.trim() ||
          "",

        stories:
          stories.map(
            (story) =>
              story._id
          ),
      });

    /*
     * Return populated Highlight.
     */
    const populated =
      await StoryHighlight.findById(
        highlight._id
      )
        .populate(
          "stories"
        )
        .lean();

    return res.status(201).json({
      success: true,
      message:
        "Highlight created successfully",
      highlight:
        populated,
    });
  } catch (error) {
    console.error(
      "Create highlight error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create highlight",
    });
  }
};

/*
 * ============================================================
 * GET MY HIGHLIGHTS
 * ============================================================
 *
 * GET /api/story-highlights
 */
export const getMyHighlights =
  async (
    req,
    res
  ) => {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      const highlights =
        await StoryHighlight.find({
          owner:
            req.user._id,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "stories"
          )
          .lean();

      return res.status(200).json({
        success: true,
        highlights,
      });
    } catch (error) {
      console.error(
        "Get highlights error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch highlights",
      });
    }
  };

/*
 * ============================================================
 * GET SINGLE HIGHLIGHT
 * ============================================================
 *
 * GET /api/story-highlights/:highlightId
 *
 * Only the owner can use this endpoint
 * for the current profile-management flow.
 */
export const getHighlightById =
  async (
    req,
    res
  ) => {
    try {
      const {
        highlightId,
      } = req.params;

      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          highlightId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid highlight ID",
        });
      }

      const highlight =
        await StoryHighlight.findOne({
          _id:
            highlightId,

          owner:
            req.user._id,
        })
          .populate(
            "stories"
          )
          .lean();

      if (!highlight) {
        return res.status(404).json({
          success: false,
          message:
            "Highlight not found",
        });
      }

      return res.status(200).json({
        success: true,
        highlight,
      });
    } catch (error) {
      console.error(
        "Get highlight error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch highlight",
      });
    }
  };

/*
 * ============================================================
 * ADD STORY TO HIGHLIGHT
 * ============================================================
 *
 * POST
 * /api/story-highlights/:highlightId/stories/:storyId
 */
export const addStoryToHighlight =
  async (
    req,
    res
  ) => {
    try {
      const {
        highlightId,
        storyId,
      } = req.params;

      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      /*
       * Validate IDs.
       */
      if (
        !mongoose.Types.ObjectId.isValid(
          highlightId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid highlight ID",
        });
      }

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
       * Check Story ownership.
       */
      const story =
        await Story.findOne({
          _id:
            storyId,

          user:
            req.user._id,

          status: {
            $in: [
              "active",
              "archived",
            ],
          },
        }).select(
          "_id"
        );

      if (!story) {
        return res.status(404).json({
          success: false,
          message:
            "Story not found",
        });
      }

      /*
       * Check Highlight ownership.
       */
      const highlight =
        await StoryHighlight.findOne({
          _id:
            highlightId,

          owner:
            req.user._id,
        });

      if (!highlight) {
        return res.status(404).json({
          success: false,
          message:
            "Highlight not found",
        });
      }

      /*
       * Add Story without duplicates.
       */
      await StoryHighlight.updateOne(
        {
          _id:
            highlightId,

          owner:
            req.user._id,
        },
        {
          $addToSet: {
            stories:
              storyId,
          },
        }
      );

      const updated =
        await StoryHighlight.findById(
          highlightId
        )
          .populate(
            "stories"
          )
          .lean();

      return res.status(200).json({
        success: true,
        message:
          "Story added to highlight",
        highlight:
          updated,
      });
    } catch (error) {
      console.error(
        "Add story to highlight error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update highlight",
      });
    }
  };

/*
 * ============================================================
 * REMOVE STORY FROM HIGHLIGHT
 * ============================================================
 *
 * DELETE
 * /api/story-highlights/:highlightId/stories/:storyId
 */
export const removeStoryFromHighlight =
  async (
    req,
    res
  ) => {
    try {
      const {
        highlightId,
        storyId,
      } = req.params;

      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          highlightId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid highlight ID",
        });
      }

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

      const highlight =
        await StoryHighlight.findOne({
          _id:
            highlightId,

          owner:
            req.user._id,
        });

      if (!highlight) {
        return res.status(404).json({
          success: false,
          message:
            "Highlight not found",
        });
      }

      /*
       * Remove only this Story.
       */
      highlight.stories =
        highlight.stories.filter(
          (id) =>
            id.toString() !==
            storyId.toString()
        );

      /*
       * If no Stories remain,
       * remove the Highlight itself.
       */
      if (
        highlight.stories.length ===
        0
      ) {
        await StoryHighlight.deleteOne(
          {
            _id:
              highlightId,

            owner:
              req.user._id,
          }
        );

        return res.status(200).json({
          success: true,
          message:
            "Story removed and empty highlight deleted",
          deleted:
            true,
        });
      }

      await highlight.save();

      const updated =
        await StoryHighlight.findById(
          highlightId
        )
          .populate(
            "stories"
          )
          .lean();

      return res.status(200).json({
        success: true,
        message:
          "Story removed from highlight",
        highlight:
          updated,
        deleted:
          false,
      });
    } catch (error) {
      console.error(
        "Remove story from highlight error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to remove story",
      });
    }
  };

/*
 * ============================================================
 * DELETE HIGHLIGHT
 * ============================================================
 *
 * DELETE /api/story-highlights/:highlightId
 */
export const deleteHighlight =
  async (
    req,
    res
  ) => {
    try {
      const {
        highlightId,
      } = req.params;

      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          highlightId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid highlight ID",
        });
      }

      const deleted =
        await StoryHighlight.findOneAndDelete(
          {
            _id:
              highlightId,

            owner:
              req.user._id,
          }
        );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message:
            "Highlight not found",
        });
      }

      /*
       * IMPORTANT:
       *
       * Deleting a Highlight does NOT
       * delete the underlying Stories.
       *
       * Story analytics remain untouched.
       */
      return res.status(200).json({
        success: true,
        message:
          "Highlight deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete highlight error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to delete highlight",
      });
    }
  };