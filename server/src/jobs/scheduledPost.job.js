import ScheduledPost from "../models/ScheduledPost.model.js";
import ScheduledPostError from "../models/ScheduledPostError.model.js";
import { publishScheduledPost } from "../controllers/scheduledPost.controller.js";

const MAX_ATTEMPTS = 3;
const STALE_CLAIM_MS = 5 * 60 * 1000;

/*
 * Claims are atomic so two application instances cannot work on the same
 * scheduled record at once. A stale publishing claim is recovered after a
 * process crash; attempts are still bounded and every failed attempt logged.
 */
const run = async () => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);

  await ScheduledPost.updateMany(
    { status: "publishing", updatedAt: { $lte: staleBefore }, attempts: { $lt: MAX_ATTEMPTS } },
    { $set: { status: "scheduled", lastError: "Recovered stale publishing claim after worker interruption." } },
  );
  await ScheduledPost.updateMany(
    { status: "publishing", updatedAt: { $lte: staleBefore }, attempts: { $gte: MAX_ATTEMPTS } },
    { $set: { status: "failed", lastError: "Publishing worker stopped after maximum attempts." }, $unset: { activeSlot: 1 } },
  );

  const due = await ScheduledPost.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
    attempts: { $lt: MAX_ATTEMPTS },
  }).sort({ scheduledAt: 1 }).limit(50).select("_id");

  for (const candidate of due) {
    const claimed = await ScheduledPost.findOneAndUpdate(
      { _id: candidate._id, status: "scheduled", scheduledAt: { $lte: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
      { $set: { status: "publishing", lastError: "" }, $inc: { attempts: 1 } },
      { new: true },
    );
    if (!claimed) continue;

    try {
      await publishScheduledPost(claimed);
    } catch (error) {
      const message = String(error?.message || "Scheduled publication failed").slice(0, 2000);
      try {
        await ScheduledPostError.create({
          post: claimed._id, user: claimed.user, attempt: claimed.attempts,
          error: message, stack: String(error?.stack || "").slice(0, 8000),
        });
      } catch (logError) {
        console.error("Failed to write scheduled-post error log:", logError.message);
      }
      await ScheduledPost.updateOne(
        { _id: claimed._id, status: "publishing" },
        { $set: { lastError: message, status: claimed.attempts >= MAX_ATTEMPTS ? "failed" : "scheduled" }, ...(claimed.attempts >= MAX_ATTEMPTS ? { $unset: { activeSlot: 1 } } : {}) },
      );
      console.error("Scheduled post publish failed:", message);
    }
  }
};

export const startScheduledPostJob = () => {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await run(); }
    catch (error) { console.error("Scheduled post job:", error.message); }
    finally { running = false; }
  };
  void tick();
  setInterval(tick, 60 * 1000);
  console.log("Scheduled post job started");
};
