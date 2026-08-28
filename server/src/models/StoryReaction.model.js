import mongoose from "mongoose";

const storyReactionSchema = new mongoose.Schema(
  {
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reaction: {
      type: String,
      enum: [
        "like",
        "love",
        "haha",
        "wow",
        "sad",
        "angry",
      ],
      default: "like",
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One reaction per user per story.
 */
storyReactionSchema.index(
  {
    story: 1,
    user: 1,
  },
  {
    unique: true,
  }
);

storyReactionSchema.index({
  story: 1,
  reaction: 1,
});

export default mongoose.model(
  "StoryReaction",
  storyReactionSchema
);