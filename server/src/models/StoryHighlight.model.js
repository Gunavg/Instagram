import mongoose from "mongoose";

const storyHighlightSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    coverUrl: {
      type: String,
      default: "",
    },

    stories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
  },
  {
    timestamps: true,
  }
);

storyHighlightSchema.index({
  owner: 1,
  createdAt: -1,
});

export default mongoose.model(
  "StoryHighlight",
  storyHighlightSchema
);