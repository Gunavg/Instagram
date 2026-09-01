import Story from "../models/Story.model.js";
import Follow from "../models/Follow.model.js";
import CloseFriend from "../models/CloseFriend.model.js";
import {
  uploadToCloudinary,
} from "../middleware/storyUpload.middleware.js";

/*
 * ============================================================
 * CHECK STORY ACCESS
 * ============================================================
 *
 * This function is used by:
 *
 * - getStories()
 * - recordStoryView()
 * - reactToStory()
 * - replyToStory()
 *
 * Privacy:
 *
 * public
 * followers
 * close_friends
 */
export const canViewStory = async (
  story,
  viewerId
) => {
  if (!story || !viewerId) {
    return false;
  }

  /*
   * Story owner can always access
   * their own Story.
   */
  if (
    story.user.toString() ===
    viewerId.toString()
  ) {
    return true;
  }

  /*
   * Public Story.
   */
  if (
    story.privacy === "public"
  ) {
    return true;
  }

  /*
   * Followers-only Story.
   */
  if (
    story.privacy === "followers"
  ) {
    const follow =
      await Follow.exists({
        follower: viewerId,
        following: story.user,
      });

    return Boolean(follow);
  }

  /*
   * Close Friends Story.
   */
  if (
    story.privacy === "close_friends"
  ) {
    const closeFriend =
      await CloseFriend.exists({
        owner: story.user,
        friend: viewerId,
      });

    return Boolean(closeFriend);
  }

  return false;
};

/*
 * ============================================================
 * CREATE STORY
 * ============================================================
 *
 * POST /api/stories
 */
export const createStory = async (
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

    /*
     * Check uploaded files.
     */
    if (
      !req.files ||
      req.files.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload at least one image or video",
      });
    }

    /*
     * Maximum 10 media files.
     */
    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message:
          "You can upload a maximum of 10 media files",
      });
    }

    /*
     * Privacy.
     */
    const privacy =
      req.body?.privacy ||
      "public";

    const allowedPrivacy = [
      "public",
      "followers",
      "close_friends",
    ];

    if (
      !allowedPrivacy.includes(
        privacy
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid privacy setting",
      });
    }

    /*
     * Upload all media files
     * to Cloudinary.
     *
     * storyUpload.middleware.js uses
     * multer memoryStorage(), therefore
     * file.buffer must be sent to Cloudinary.
     */
    const media =
      await Promise.all(
        req.files.map(
          async (file) => {
            const result =
              await uploadToCloudinary(
                file
              );

            if (
              !result ||
              !result.secure_url
            ) {
              throw new Error(
                "Cloudinary upload failed"
              );
            }

            return {
              url:
                result.secure_url,

              publicId:
                result.public_id ||
                "",

              type:
                file.mimetype.startsWith(
                  "video/"
                )
                  ? "video"
                  : "image",

              width:
                result.width,

              height:
                result.height,

              duration:
                result.duration,
            };
          }
        )
      );

    /*
     * Story lifetime = 24 hours.
     */
    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          24 *
            60 *
            60 *
            1000
      );

    /*
     * Create Story.
     */
    const story =
      await Story.create({
        user:
          req.user._id,

        media,

        privacy,

        status:
          "active",

        createdAt:
          now,

        expiresAt,
      });

    /*
     * Populate Story owner.
     */
    const populatedStory =
      await Story.findById(
        story._id
      ).populate(
        "user",
        "_id username fullName profilePicture"
      );

    return res.status(201).json({
      success: true,
      message:
        "Story created successfully",
      story:
        populatedStory,
    });
  } catch (error) {
    console.error(
      "Create story error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create story",
    });
  }
};

/*
 * ============================================================
 * GET ACTIVE STORIES
 * ============================================================
 *
 * GET /api/stories
 */
export const getStories = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const viewerId =
      req.user._id;

    const now =
      new Date();

    /*
     * Get people followed by
     * current user.
     */
    const following =
      await Follow.find({
        follower:
          viewerId,
      })
        .select(
          "following"
        )
        .lean();

    const followingIds =
      following.map(
        (item) =>
          item.following
      );

    /*
     * Get current user's
     * close friends.
     */
    const closeFriends =
      await CloseFriend.find({
        owner:
          viewerId,
      })
        .select(
          "friend"
        )
        .lean();

    const closeFriendIds =
      closeFriends.map(
        (item) =>
          item.friend
      );

    /*
     * Get Stories the user
     * is allowed to see.
     *
     * This avoids executing a
     * Follow/CloseFriend query
     * for every Story.
     */
    const stories =
      await Story.find({
        status:
          "active",

        expiresAt: {
          $gt: now,
        },

        $or: [
          /*
           * Own Stories.
           */
          {
            user:
              viewerId,
          },

          /*
           * Public Stories.
           */
          {
            privacy:
              "public",
          },

          /*
           * Followers-only Stories
           * from users the viewer follows.
           */
          {
            privacy:
              "followers",

            user: {
              $in:
                followingIds,
            },
          },

          /*
           * Close Friends Stories.
           */
          {
            privacy:
              "close_friends",

            user: {
              $in:
                closeFriendIds,
            },
          },
        ],
      })
        .populate(
          "user",
          "_id username fullName profilePicture"
        )
        .sort({
          createdAt:
            1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      stories,
    });
  } catch (error) {
    console.error(
      "Get stories error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get stories",
    });
  }
};

/*
 * ============================================================
 * GET MY ARCHIVED STORIES
 * ============================================================
 *
 * GET /api/stories/archive
 *
 * Used for:
 *
 * - archived Stories
 * - Story Highlights
 * - historical analytics
 */
export const getMyArchivedStories =
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

      const stories =
        await Story.find({
          user:
            req.user._id,

          status: {
            $in: [
              "archived",
              "deleted",
            ],
          },
        })
          .sort({
            archivedAt:
              -1,

            createdAt:
              -1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        stories,
      });
    } catch (error) {
      console.error(
        "Get archived stories error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get archived stories",
      });
    }
  };

/*
 * ============================================================
 * DELETE STORY
 * ============================================================
 *
 * DELETE /api/stories/:id
 *
 * Only the Story owner can delete
 * their own active Story.
 *
 * The database record is retained so
 * analytics are not lost.
 */
export const deleteStory = async (
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

    const story =
      await Story.findOne({
        _id:
          req.params.id,

        user:
          req.user._id,

        status:
          "active",
      });

    if (!story) {
      return res.status(404).json({
        success: false,
        message:
          "Story not found",
      });
    }

    /*
     * Do not physically remove the
     * Story document.
     *
     * Analytics must be retained.
     */
    story.status =
      "deleted";

    story.deletedAt =
      new Date();

    await story.save();

    return res.status(200).json({
      success: true,
      message:
        "Story deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete story error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete story",
    });
  }
};