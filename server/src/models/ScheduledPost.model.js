import mongoose from "mongoose";

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  media: { type: Array, required: true },
  caption: { type: String, maxlength: 2200, default: "" },
  hashtags: [String],
  taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  location: { type: String, default: "" },
  visibility: { type: String, enum: ["public", "followers"], default: "public" },
  status: { type: String, enum: ["scheduled", "published", "cancelled", "failed"], default: "scheduled", index: true },
  scheduledAt: { type: Date, required: true, index: true },
  publishedAt: { type: Date, default: null },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: "" },
}, { timestamps: true });

schema.index({ user: 1, status: 1, scheduledAt: 1 });
schema.index({ status: 1, scheduledAt: 1 });

export default mongoose.model("ScheduledPost", schema);
