import mongoose from "mongoose";

const storyViewSchema = new mongoose.Schema(
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

    firstViewedAt: {
      type: Date,
      default: Date.now,
    },

    lastViewedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    maxMediaIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * CRITICAL:
 *
 * One user can have only one view record
 * for one story.
 *
 * This is the database-level protection
 * against duplicate unique views.
 */
storyViewSchema.index(
  {
    story: 1,
    viewer: 1,
  },
  {
    unique: true,
  }
);

/*
 * Timeline analytics.
 */
storyViewSchema.index({
  story: 1,
  firstViewedAt: 1,
});

/*
 * Viewer list.
 */
storyViewSchema.index({
  story: 1,
  lastViewedAt: -1,
});

export default mongoose.model("StoryView", storyViewSchema);