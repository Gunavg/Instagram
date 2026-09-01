import mongoose from "mongoose";

const storyViewEventSchema = new mongoose.Schema(
  {
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
      index: true,
    },

    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    mediaIndex: {
      type: Number,
      default: 0,
      min: 0,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    viewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

storyViewEventSchema.index({
  story: 1,
  viewedAt: -1,
});

storyViewEventSchema.index({
  story: 1,
  viewer: 1,
  viewedAt: -1,
});

export default mongoose.model(
  "StoryViewEvent",
  storyViewEventSchema
);