import CloseFriend from "../models/CloseFriend.model.js";
import User from "../models/User.model.js";

export const addCloseFriend = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    if (
      userId.toString() ===
      req.user._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot add yourself",
      });
    }

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await CloseFriend.updateOne(
      {
        owner: req.user._id,
        friend: userId,
      },
      {
        $setOnInsert: {
          owner: req.user._id,
          friend: userId,
        },
      },
      {
        upsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Added to close friends",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeCloseFriend = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    await CloseFriend.findOneAndDelete({
      owner: req.user._id,
      friend: userId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Removed from close friends",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCloseFriends = async (
  req,
  res
) => {
  try {
    const friends =
      await CloseFriend.find({
        owner: req.user._id,
      })
        .populate(
          "friend",
          "username fullName profilePicture"
        )
        .lean();

    return res.status(200).json({
      success: true,
      users: friends.map(
        (item) => item.friend
      ),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};