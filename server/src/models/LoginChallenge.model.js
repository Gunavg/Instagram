import mongoose from "mongoose";

const loginChallengeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, required: true },
    userAgent: { type: String, default: "" },
    browser: { type: String, default: "" },
    operatingSystem: { type: String, default: "" },
    deviceType: { type: String, enum: ["Desktop", "Laptop", "Mobile"], required: true },
    ipAddress: { type: String, default: "Unknown" },
  },
  { timestamps: true },
);

loginChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("LoginChallenge", loginChallengeSchema);