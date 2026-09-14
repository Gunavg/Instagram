import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
    plan: { type: String, enum: ["bronze", "silver", "gold"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "inr" },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
    },
    stripeCheckoutSessionId: { type: String, unique: true, sparse: true, index: true },
    stripeInvoiceId: { type: String, default: "", index: true },
    stripePaymentIntentId: { type: String, default: "" },
    failureReason: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    receiptUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Payment", paymentSchema);
