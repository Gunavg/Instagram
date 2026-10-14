import mongoose from "mongoose";

const otpRateLimitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  purpose: { type: String, enum: ["language_change", "chrome_login"], required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

otpRateLimitSchema.index({ user: 1, purpose: 1, windowStart: 1 }, { unique: true });
otpRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OtpRateLimit", otpRateLimitSchema);
