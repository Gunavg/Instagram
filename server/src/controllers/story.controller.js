import Story from "../models/Story.model.js";
import Follow from "../models/Follow.model.js";
import CloseFriend from "../models/CloseFriend.model.js";
import {
  uploadToCloudinary,
} from "../middleware/storyUpload.middleware.js";

const media = [];

for (const file of req.files) {
  const uploaded =
    await uploadToCloudinary(file);

  media.push({
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    type:
      file.mimetype.startsWith(
        "video/"
      )
        ? "video"
        : "image",
  });
}
const canViewStory = async (
  story,
  viewerId
) => {
  if (
    story.user.toString() ===
    viewerId.toString()
  ) {
    return true;
  }

  if (story.privacy === "public") {
    return true;
  }

  if (story.privacy === "followers") {
    const follow =
      await Follow.exists({
        follower: viewerId,
        following: story.user,
      });

    return Boolean(follow);
  }

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
 * CREATE STORY
 */
export const createStory = async (
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

    const privacy =
      req.body?.privacy || "public";

    if (
      ![
        "public",
        "followers",
        "close_friends",
      ].includes(privacy)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid privacy setting",
      });
    }

    /*
     * NOTE:
     *
     * req.files must contain uploaded
     * URLs.
     *
     * Your current memoryStorage middleware
     * does not provide file.path.
     *
     * Connect your Cloudinary upload function
     * here.
     */
    const media = req.files.map(
      (file) => ({
        url:
          file.path ||
          file.location ||
          file.url,
        type:
          file.mimetype?.startsWith(
            "video/"
          )
            ? "video"
            : "image",
      })
    );

    const invalidMedia =
      media.some(
        (item) => !item.url
      );

    if (invalidMedia) {
      return res.status(500).json({
        success: false,
        message:
          "Media upload failed. No media URL was generated.",
      });
    }

    const now = new Date();

    const expiresAt = new Date(
      now.getTime() +
        24 * 60 * 60 * 1000
    );

    const story = await Story.create({
      user: req.user._id,
      media,
      privacy,
      status: "active",
      createdAt: now,
      expiresAt,
    });

    const populated =
      await Story.findById(
        story._id
      ).populate(
        "user",
        "username fullName profilePicture"
      );

    return res.status(201).json({
      success: true,
      message:
        "Story created successfully",
      story: populated,
    });
  } catch (error) {
    console.error(
      "Create story error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * GET ACTIVE STORIES
 */
export const getStories = async (
  req,
  res
) => {
  try {
    const now = new Date();

    const stories =
      await Story.find({
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

    const visibleStories = [];

    for (const story of stories) {
      const allowed =
        await canViewStory(
          story,
          req.user._id
        );

      if (allowed) {
        visibleStories.push(
          story
        );
      }
    }

    return res.status(200).json({
      success: true,
      stories: visibleStories,
    });
  } catch (error) {
    console.error(
      "Get stories error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * DELETE OWN STORY
 */
export const deleteStory = async (
  req,
  res
) => {
  try {
    const story =
      await Story.findOne({
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

    story.status = "deleted";
    story.deletedAt = new Date();

    await story.save();

    return res.status(200).json({
      success: true,
      message:
        "Story deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};