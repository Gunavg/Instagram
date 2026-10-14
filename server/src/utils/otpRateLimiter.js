import OtpRateLimit from "../models/OtpRateLimit.model.js";

const WINDOW_MS = 60 * 60 * 1000;

export const consumeOtpRateLimit = async (userId, purpose, maxRequests) => {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
  const expiresAt = new Date(windowStart.getTime() + (2 * WINDOW_MS));
  const filter = { user: userId, purpose, windowStart };
  let record;

  try {
    record = await OtpRateLimit.findOneAndUpdate(
      filter,
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    // A concurrent first request can win the unique-key race; increment its row.
    if (error?.code !== 11000) throw error;
    record = await OtpRateLimit.findOneAndUpdate(
      filter,
      { $inc: { count: 1 } },
      { new: true },
    );
  }

  if (!record) throw new Error("Unable to record OTP rate limit.");
  return {
    allowed: record.count <= maxRequests,
    count: record.count,
    remaining: Math.max(0, maxRequests - record.count),
    resetsAt: expiresAt,
  };
};
