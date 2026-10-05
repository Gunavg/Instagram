import Subscription from "../models/Subscription.model.js";
import Post from "../models/Post.model.js";
import ScheduledPost from "../models/ScheduledPost.model.js";
import { SUBSCRIPTION_PLANS } from "../config/subscriptionPlans.js";
import { clearExpiredSubscription } from "../services/subscription.service.js";

export const getPostAllowance = async (userId) => {
  let subscription = await Subscription.findOne({ user: userId });
  subscription = await clearExpiredSubscription(subscription);
  const plan = subscription?.plan || "free";
  const limit = SUBSCRIPTION_PLANS[plan]?.postingLimit ?? 1;

  if (plan !== "free" && subscription?.status !== "active") {
    return { allowed: false, plan, limit, used: 0, scheduled: 0, remaining: 0, subscription };
  }

  const postFilter = { user: userId, isDeleted: false, scheduleStatus: "published" };
  if (plan !== "free" && subscription?.currentPeriodStart) {
    postFilter.createdAt = { $gte: subscription.currentPeriodStart };
    if (subscription.currentPeriodEnd) postFilter.createdAt.$lt = subscription.currentPeriodEnd;
  }

  const used = await Post.countDocuments(postFilter);
  const scheduled = await ScheduledPost.countDocuments({
    user: userId,
    status: "scheduled",
    scheduledAt: { $gt: new Date() },
  });
  const effectiveUsed = used + scheduled;
  const allowed = limit === Infinity || effectiveUsed < limit;

  return {
    allowed,
    plan,
    limit,
    used,
    scheduled,
    effectiveUsed,
    remaining: limit === Infinity ? Infinity : Math.max(0, limit - effectiveUsed),
    subscription,
  };
};

export const enforcePostLimit = async (req, res, next) => {
  try {
    const allowance = await getPostAllowance(req.user._id);
    if (allowance.plan !== "free" && allowance.subscription?.status !== "active") {
      return res.status(403).json({ success: false, code: "SUBSCRIPTION_NOT_ACTIVE", message: "Your paid subscription is not active." });
    }
    if (!allowance.allowed) {
      return res.status(403).json({
        success: false,
        code: "POST_LIMIT_REACHED",
        message: allowance.plan === "free" ? "Free Plan allows only 1 post." : `${SUBSCRIPTION_PLANS[allowance.plan].name} allows up to ${allowance.limit} posts per billing period.`,
        subscription: { plan: allowance.plan, limit: allowance.limit, used: allowance.used, scheduled: allowance.scheduled },
      });
    }
    req.subscription = allowance.subscription;
    req.postAllowance = allowance;
    next();
  } catch (error) {
    console.error("Post subscription validation failed:", error);
    res.status(500).json({ success: false, message: "Unable to validate your subscription." });
  }
};

export const enforceScheduleAllowance = async (req, res, next) => {
  try {
    const allowance = await getPostAllowance(req.user._id);
    if (allowance.plan !== "free" && allowance.subscription?.status !== "active") {
      return res.status(403).json({ success: false, code: "SUBSCRIPTION_NOT_ACTIVE", message: "Your paid subscription is not active." });
    }
    if (allowance.scheduled >= 2) {
      return res.status(403).json({ success: false, code: "SCHEDULE_LIMIT_REACHED", message: "You can have a maximum of 2 scheduled posts at a time." });
    }
    if (allowance.limit !== Infinity && allowance.used + allowance.scheduled >= allowance.limit) {
      return res.status(403).json({
        success: false,
        code: "SCHEDULE_QUOTA_REACHED",
        message: `Your ${SUBSCRIPTION_PLANS[allowance.plan].name} posting quota does not allow another scheduled post.`,
        subscription: { plan: allowance.plan, limit: allowance.limit, published: allowance.used, scheduled: allowance.scheduled },
      });
    }
    req.subscription = allowance.subscription;
    req.postAllowance = allowance;
    next();
  } catch (error) {
    console.error("Scheduled post allowance validation failed:", error);
    res.status(500).json({ success: false, message: "Unable to validate your subscription before scheduling." });
  }
};
