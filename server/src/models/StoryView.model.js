import mongoose from "mongoose";

/*
 * STORY VIEW SCHEMA
 *
 * One StoryView document represents one user's
 * viewing activity for one Story.
 *
 * IMPORTANT:
 * A user must be counted only once as a
 * unique viewer for the same Story.
 */
const storyViewSchema = new mongoose.Schema(
  {
    /*
     * Story being viewed.
     */
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
    },

    /*
     * User who viewed the Story.
     */
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /*
     * First time this user viewed
     * the Story.
     *
     * Used for:
     * - total view timeline
     * - first-view timestamp
     * - analytics
     */
    firstViewedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    /*
     * Most recent time this user
     * interacted with/viewed the Story.
     */
    lastViewedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    /*
     * Time when the viewer reached
     * the end of the Story.
     *
     * null = viewer did not complete it.
     */
    completedAt: {
      type: Date,
      default: null,
    },

    /*
     * Highest media index reached
     * by this viewer.
     *
     * Example:
     *
     * Story has:
     * 0 -> image
     * 1 -> video
     * 2 -> image
     *
     * maxMediaIndex = 2 means the
     * viewer reached the final media.
     */
    maxMediaIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * =========================================================
 * CRITICAL UNIQUE INDEX
 * =========================================================
 *
 * One user can have ONLY ONE StoryView record
 * for the same Story.
 *
 * This prevents:
 *
 * Story A + User B
 * Story A + User B
 * Story A + User B
 *
 * from becoming multiple unique viewers.
 *
 * MongoDB will reject duplicate records with
 * error code 11000.
 *
 * The analytics controller already handles
 * this duplicate-key situation safely.
 */
storyViewSchema.index(
  {
    story: 1,
    viewer: 1,
  },
  {
    unique: true,
    name: "unique_story_viewer",
  }
);

/*
 * =========================================================
 * STORY TIMELINE INDEX
 * =========================================================
 *
 * Used by analytics queries such as:
 *
 * StoryView.aggregate([
 *   { $match: { story: storyId } },
 *   ...
 * ])
 *
 * and hourly view timeline queries.
 */
storyViewSchema.index(
  {
    story: 1,
    firstViewedAt: 1,
  },
  {
    name: "story_first_view_timeline",
  }
);

/*
 * =========================================================
 * VIEWER LIST INDEX
 * =========================================================
 *
 * Used when displaying:
 *
 * Latest viewers
 * Viewer list
 * Most recently viewed users
 */
storyViewSchema.index(
  {
    story: 1,
    lastViewedAt: -1,
  },
  {
    name: "story_latest_viewers",
  }
);

/*
 * =========================================================
 * COMPLETION ANALYTICS INDEX
 * =========================================================
 *
 * Helps queries that need to find completed
 * viewers for a particular Story.
 */
storyViewSchema.index(
  {
    story: 1,
    completedAt: 1,
  },
  {
    name: "story_completion_analytics",
  }
);

export default mongoose.model(
  "StoryView",
  storyViewSchema
);
