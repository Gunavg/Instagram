import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true },
    phoneNumber: { type: String, default: "", trim: true },
    password: { type: String, required: true, select: false },
    website: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
    accountType: { type: String, default: "public", enum: ["private", "public"] },
    gender: { type: String, default: "other", enum: ["male", "female", "other"] },
    language: { type: String, enum: ["en", "es", "hi", "pt", "zh", "fr"], default: "en" },
    role: { type: String, enum: ["user", "administrator"], default: "user", index: true },
    status: { type: String, enum: ["active", "suspended", "deactivated"], default: "active", index: true },
    lastActiveAt: { type: Date, default: Date.now, index: true },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    PostCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false, index: true },
    refreshToken: { type: String, default: "", select: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1, createdAt: -1 });
userSchema.index({ status: 1, lastActiveAt: -1 });

export default mongoose.model("User", userSchema);