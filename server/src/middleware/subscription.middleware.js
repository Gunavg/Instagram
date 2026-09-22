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

    if (limit === Infinity) return next();

    const postCount = await Post.countDocuments({
      user: req.user._id,
      isDeleted: false,
    });

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