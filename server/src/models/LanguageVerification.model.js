import mongoose from "mongoose";

const languageVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    language: {
      type: String,
      enum: ["en", "es", "hi", "pt", "zh", "fr"],
      required: true,
    },
    deliveryMethod: {
      type: String,
      enum: ["email", "sms"],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

languageVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("LanguageVerification", languageVerificationSchema);
