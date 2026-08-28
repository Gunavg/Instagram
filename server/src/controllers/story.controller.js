import Story from "../models/Story.model.js";

/*
 * CREATE STORY
 */
export const createStory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image or video",
      });
    }

    /*
     * Convert uploaded files to story media.
     *
     * IMPORTANT:
     * Keep the URL generation/upload logic that you already use.
     */
    const media = req.files.map((file) => ({
      url: file.path || file.location || file.url,
      type: file.mimetype?.startsWith("video/")
        ? "video"
        : "image",
    }));

    const now = new Date();

    /*
     * 24-HOUR EXPIRATION
     */
    const expiresAt = new Date(
      now.getTime() + 24 * 60 * 60 * 1000
    );

    const story = await Story.create({
      user: req.user._id,
      media,
      createdAt: now,
      expiresAt,
    });

    const populatedStory = await Story.findById(story._id).populate(
      "user",
      "-password -refreshToken"
    );

    return res.status(201).json({
      success: true,
      message: "Story created successfully",
      story: populatedStory,
    });
  } catch (error) {
    console.error("Create story error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/*
 * GET STORIES
 *
 * Only stories that have NOT expired are returned.
 */
export const getStories = async (req, res) => {
  try {
    const now = new Date();

    const stories = await Story.find({
      expiresAt: {
        $gt: now,
      },
    })
      .populate(
        "user",
        "_id username fullName profilePicture profilePic"
      )
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      stories,
    });
  } catch (error) {
    console.error("Get stories error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/*
 * DELETE STORY
 */
export const deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your own story",
      });
    }

    await Story.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error) {
    console.error("Delete story error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};