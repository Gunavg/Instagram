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
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);
router.use(protect);
router.get("/me", getMySubscription);
router.post("/checkout", createSubscriptionCheckout);
router.post("/verify", verifySubscriptionCheckout);
router.post("/cancel", cancelSubscription);

export default router;
