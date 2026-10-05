import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String },
    type: { type: String, enum: ["image", "video"], required: true },
    width: Number,
    height: Number,
    duration: Number,
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    media: {
      type: [mediaSchema],
      validate: [(arr) => arr.length > 0, "At least one media is required"],
    },
    caption: { type: String, maxlength: 2200, default: "" },
    hashtags: [{ type: String, trim: true, lowercase: true }],
    location: { type: String, default: "", trim: true },
    taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    visibility: { type: String, enum: ["public", "followers"], default: "public", index: true },
    scheduleStatus: { type: String, enum: ["published", "scheduled", "cancelled", "failed"], default: "published", index: true },
    scheduledAt: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null, index: true },
    publishAttempts: { type: Number, default: 0 },
    publishError: { type: String, default: "" },
    lastPublishAttemptAt: { type: Date, default: null },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    savesCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    isEdited: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ scheduleStatus: 1, scheduledAt: 1 });
postSchema.index({ scheduleStatus: 1, createdAt: -1 });

export default mongoose.model("Post", postSchema);