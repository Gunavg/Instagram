import Subscription from "../models/Subscription.model.js";
import Post from "../models/Post.model.js";
import { SUBSCRIPTION_PLANS } from "../config/subscriptionPlans.js";
import { clearExpiredSubscription } from "../services/subscription.service.js";

export const enforcePostLimit = async (req, res, next) => {
  try {
    let subscription = await Subscription.findOne({ user: req.user._id });
    subscription = await clearExpiredSubscription(subscription);

    const plan = subscription?.plan || "free";
    const limit = SUBSCRIPTION_PLANS[plan]?.postingLimit ?? 1;

    if (plan !== "free" && subscription?.status !== "active") {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_NOT_ACTIVE",
        message: "Your paid subscription is not active. Renew or choose an active plan before posting.",
        subscription: {
          plan,
          status: subscription?.status || "unknown",
        },
      });
    }

    if (limit === Infinity) return next();

    const postFilter = {
      user: req.user._id,
      isDeleted: false,
    };

    // Paid plans reset their posting allowance at the start of each
    // billing period. The free plan keeps its one-post lifetime allowance.
    if (plan !== "free" && subscription?.currentPeriodStart) {
      postFilter.createdAt = { $gte: subscription.currentPeriodStart };
      if (subscription.currentPeriodEnd) {
        postFilter.createdAt.$lt = subscription.currentPeriodEnd;
      }
    }

    const postCount = await Post.countDocuments(postFilter);

    if (postCount >= limit) {
      return res.status(403).json({
        success: false,
        code: "POST_LIMIT_REACHED",
        message:
          plan === "free"
            ? "Free Plan allows only 1 post. Upgrade your plan to post more."
            : `${SUBSCRIPTION_PLANS[plan].name} allows up to ${limit} posts. Upgrade your plan to post more.`,
        subscription: {
          plan,
          limit,
          used: postCount,
        },
      });
    }

    req.subscription = subscription;
    req.postAllowance = {
      plan,
      limit,
      used: postCount,
      remaining: limit - postCount,
    };
    next();
  } catch (error) {
    console.error("Post subscription validation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to validate your subscription before posting.",
    });
  }
};