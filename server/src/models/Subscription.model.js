import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "past_due", "canceled", "incomplete", "unpaid"],
      default: "active",
    },
    stripeCustomerId: { type: String, default: "" },
    stripeSubscriptionId: { type: String, default: "", index: true },
    stripePriceId: { type: String, default: "" },
    latestInvoiceId: { type: String, default: "" },
    latestPaymentIntentId: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "inr" },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    nextRenewalDate: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
    lastPaymentStatus: { type: String, default: "" },
    lastPaymentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Subscription", subscriptionSchema);
