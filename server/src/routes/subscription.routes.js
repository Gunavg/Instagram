import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  cancelSubscription,
  createSubscriptionCheckout,
  getMySubscription,
  getPlans,
  stripeWebhook,
  verifySubscriptionCheckout,
} from "../controllers/subscription.controller.js";

const router = express.Router();

router.get("/plans", getPlans);
router.get("/me", protect, getMySubscription);
router.post("/checkout", protect, createSubscriptionCheckout);
router.post("/verify", protect, verifySubscriptionCheckout);
router.post("/cancel", protect, cancelSubscription);

export { stripeWebhook };
export default router;