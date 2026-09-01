import Story from "../models/Story.model.js";
import Follow from "../models/Follow.model.js";
import CloseFriend from "../models/CloseFriend.model.js";

/*
 * Check whether a viewer is allowed to see a story.
 */
const canViewStory = async (story, viewerId) => {
  // Story owner can always view their own story.
  if (story.user.toString() === viewerId.toString()) {
    return true;
  }

  // Public story.
  if (story.privacy === "public") {
    return true;
  }

  // Followers-only story.
  if (story.privacy === "followers") {
    const follow = await Follow.exists({
      follower: viewerId,
      following: story.user,
    });

    return Boolean(follow);
  }

  // Close Friends story.
  if (story.privacy === "close_friends") {
    const closeFriend = await CloseFriend.exists({
      owner: story.user,
      friend: viewerId,
    });

    return Boolean(closeFriend);
  }

  return false;
};

/*
 * CREATE STORY
 *
 * POST /api/stories
 */
export const createStory = async (req, res) => {
  try {
    /*
     * Authentication check
     */
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /*
     * Check uploaded files.
     */
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image or video",
      });
    }

    /*
     * Privacy setting.
     */
    const privacy = req.body?.privacy || "public";

    if (
      ![
        "public",
        "followers",
        "close_friends",
      ].includes(privacy)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid privacy setting",
      });
    }

    /*
     * Convert uploaded files into Story media objects.
     *
     * Depending on your upload middleware, the URL can
     * come from:
     * - file.path
     * - file.location
     * - file.url
     */
    const media = req.files.map((file) => ({
      url: file.path || file.location || file.url,
      type: file.mimetype?.startsWith("video/")
        ? "video"
        : "image",
    }));

    /*
     * Check whether every file has a valid URL.
     */
    const invalidMedia = media.some(
      (item) => !item.url
    );

    if (invalidMedia) {
      return res.status(500).json({
        success: false,
        message:
          "Media upload failed. Uploaded file URL was not found.",
      });
    }

    /*
     * Story expires after 24 hours.
     */
    const now = new Date();

    const expiresAt = new Date(
      now.getTime() + 24 * 60 * 60 * 1000
    );

    /*
     * Save story in MongoDB.
     */
    const story = await Story.create({
      user: req.user._id,
      media,
      privacy,
      status: "active",
      createdAt: now,
      expiresAt,
    });

    /*
     * Populate owner information.
     */
    const populatedStory = await Story.findById(
      story._id
    ).populate(
      "user",
      "username fullName profilePicture"
    );

    /*
     * Return created story.
     */
    return res.status(201).json({
      success: true,
      message: "Story created successfully",
      story: populatedStory,
    });
  } catch (error) {
    console.error("Create story error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create story",
    });
  }
};

/*
 * GET ACTIVE STORIES
 *
 * GET /api/stories
 */
export const getStories = async (req, res) => {
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

    const now = new Date();

    /*
     * Get only active and non-expired stories.
     */
    const stories = await Story.find({
      status: "active",
      expiresAt: {
        $gt: now,
      },
    })
      .populate(
        "user",
        "_id username fullName profilePicture"
      )
      .sort({
        createdAt: 1,
      })
      .lean();

    /*
     * Apply privacy rules.
     */
    const visibleStories = [];

    for (const story of stories) {
      const allowed = await canViewStory(
        story,
        req.user._id
      );

      if (allowed) {
        visibleStories.push(story);
      }
    }

    return res.status(200).json({
      success: true,
      stories: visibleStories,
    });
  } catch (error) {
    console.error("Get stories error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get stories",
    });
  }
};

/*
 * DELETE OWN STORY
 *
 * DELETE /api/stories/:id
 */
export const deleteStory = async (req, res) => {
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

    /*
     * Find only the user's active story.
     */
    const story = await Story.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: "active",
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    /*
     * Keep the document for analytics/history.
     * Mark it as deleted instead of physically removing it.
     */
    story.status = "deleted";
    story.deletedAt = new Date();

    await story.save();

    return res.status(200).json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error) {
    console.error("Delete story error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to delete story",
    });
  }
};