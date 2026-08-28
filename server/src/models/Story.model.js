import mongoose from "mongoose";

const storyMediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: false,
    },

    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
  },
  {
    _id: true,
  }
);

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    media: {
      type: [storyMediaSchema],
      required: true,
      validate: {
        validator: (value) => value.length > 0,
        message: "Story must contain at least one media item",
      },
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

/*
 * MongoDB TTL index.
 *
 * MongoDB automatically removes the story when expiresAt is reached.
 */
storySchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const Story = mongoose.model("Story", storySchema);

export default Story;