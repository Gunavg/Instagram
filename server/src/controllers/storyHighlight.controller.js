import Story from "../models/Story.model.js";
import StoryHighlight from "../models/StoryHighlight.model.js";

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

    if (!title) {
      return res.status(400).json({
        success: false,
        message:
          "Highlight title is required",
      });
    }

    if (
      !Array.isArray(storyIds) ||
      storyIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Select at least one story",
      });
    }

    const stories =
      await Story.find({
        _id: {
          $in: storyIds,
        },
        user: req.user._id,
        status: {
          $in: [
            "active",
            "archived",
          ],
        },
      }).select("_id");

    
    const highlight =
      await StoryHighlight.create({
        owner: req.user._id,
        title,
        coverUrl:
          coverUrl || "",
        stories: stories.map(
          (story) => story._id
        ),
      });

    const populated =
      await StoryHighlight.findById(
        highlight._id
      ).populate("stories");

    return res.status(201).json({
      success: true,
      highlight: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyHighlights =
  async (req, res) => {
    try {
      const highlights =
        await StoryHighlight.find({
          owner: req.user._id,
        })
          .sort({
            createdAt: -1,
          })
          .populate("stories")
          .lean();

      return res.status(200).json({
        success: true,
        highlights,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

export const addStoryToHighlight =
  async (req, res) => {
    try {
      const {
        highlightId,
        storyId,
      } = req.params;

      const story =
        await Story.findOne({
          _id: storyId,
          user: req.user._id,
          status: {
            $in: [
              "active",
              "archived",
            ],
          },
        });

      if (!story) {
        return res.status(404).json({
          success: false,
          message: "Story not found",
        });
      }

      const highlight =
        await Story.findOne({
          _id: highlightId,
          owner: req.user._id,
        });

      if (!highlight) {
        return res.status(404).json({
          success: false,
          message:
            "Highlight not found",
        });
      }

      await StoryHighlight.findByIdAndUpdate(
        highlightId,
        {
          $addToSet: {
            stories: storyId,
          },
        }
      );

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };