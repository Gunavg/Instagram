import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    browser: { type: String, required: true, trim: true },
    operatingSystem: { type: String, required: true, trim: true },
    deviceType: { type: String, enum: ["Desktop", "Laptop", "Mobile"], required: true },
    ipAddress: { type: String, default: "Unknown", trim: true },
    loginAt: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ["success", "failed"], required: true, index: true },
    failureReason: { type: String, default: "" },
    verificationMethod: { type: String, enum: ["none", "email_otp"], default: "none" },
  },
  { timestamps: true },
);

loginHistorySchema.index({ user: 1, loginAt: -1 });
loginHistorySchema.index({ user: 1, status: 1, loginAt: -1 });

export default mongoose.model("LoginHistory", loginHistorySchema);