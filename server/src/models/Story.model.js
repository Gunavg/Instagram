import mongoose from "mongoose";

const storyMediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    width: Number,
    height: Number,
    duration: Number,
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

    privacy: {
      type: String,
      enum: ["public", "followers", "close_friends"],
      default: "public",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
      index: true,
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

    archivedAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    likesCount: {
      type: Number,
      default: 0,
    },

    repliesCount: {
      type: Number,
      default: 0,
    },

    viewsCount: {
      type: Number,
      default: 0,
    },

    uniqueViewersCount: {
      type: Number,
      default: 0,
    },

    completedViewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Active story lookup.
 */
storySchema.index({
  status: 1,
  expiresAt: 1,
});

/*
 * Feed lookup.
 */
storySchema.index({
  user: 1,
  status: 1,
  createdAt: -1,
});

/*
 * Privacy queries.
 */
storySchema.index({
  privacy: 1,
  status: 1,
  createdAt: -1,
});

export default mongoose.model("Story", storySchema);