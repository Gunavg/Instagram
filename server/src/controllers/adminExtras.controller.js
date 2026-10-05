import User from "../models/User.model.js";
import Post from "../models/Post.model.js";
import Story from "../models/Story.model.js";
import Subscription from "../models/Subscription.model.js";
import ScheduledPost from "../models/ScheduledPost.model.js";
import Comment from "../models/Comment.model.js";
import Report from "../models/Report.model.js";
import AdminAuditLog from "../models/AdminAuditLog.model.js";

const pageArgs = (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const dateFilter = (query, field = "createdAt") => {
  const filter = {};
  if (query.from || query.to) {
    filter[field] = {};
    if (query.from) filter[field].$gte = new Date(`${query.from}T00:00:00`);
    if (query.to) filter[field].$lte = new Date(`${query.to}T23:59:59.999`);
  }
  return filter;
};

const regex = (value) => new RegExp(String(value || "").slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

const audit = async (req, action, entityType, entityId, metadata = {}) => {
  try {
    await AdminAuditLog.create({
      admin: req.user._id,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "",
    });
  } catch (error) {
    console.error("Admin audit error:", error.message);
  }
};

export const dashboard = async (req, res) => {
  try {
    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalUsers, activeUsers, posts, stories, subscriptions, reportedContent, scheduledPosts, engagement] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active", lastActiveAt: { $gte: activeSince } }),
      Post.countDocuments({ isDeleted: false, scheduleStatus: "published" }),
      Story.countDocuments({ status: { $ne: "deleted" } }),
      Subscription.countDocuments({ status: "active" }),
      Report.countDocuments({ status: { $in: ["pending", "reviewed"] } }),
      ScheduledPost.countDocuments({ status: "scheduled" }),
      Post.aggregate([
        { $match: { isDeleted: false, scheduleStatus: "published" } },
        { $group: { _id: null, likes: { $sum: "$likesCount" }, comments: { $sum: "$commentsCount" }, shares: { $sum: "$sharesCount" } } },
      ]),
    ]);
    res.json({ success: true, stats: { totalUsers, activeUsers, posts, stories, subscriptions, reportedContent, scheduledPosts, engagement: engagement[0] || { likes: 0, comments: 0, shares: 0 } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { page, limit, skip } = pageArgs(req.query);
    const filter = { ...dateFilter(req.query) };
    if (req.query.status === "deleted") filter.isDeleted = true;
    else if (req.query.status) filter.isDeleted = false;
    if (req.query.search) filter.text = regex(req.query.search);
    const [items, total] = await Promise.all([
      Comment.find(filter).populate("user", "username email").populate("post", "caption user").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Comment.countDocuments(filter),
    ]);
    res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const updateComment = async (req, res) => {
  try {
    const updates = {};
    if (req.body.text !== undefined) updates.text = String(req.body.text).trim().slice(0, 1000);
    if (req.body.isDeleted !== undefined) { updates.isDeleted = Boolean(req.body.isDeleted); updates.deletedAt = updates.isDeleted ? new Date() : null; }
    const comment = await Comment.findByIdAndUpdate(req.params.id, updates, { new: true }).populate("user", "username email");
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
    await audit(req, "UPDATE_COMMENT", "Comment", comment._id, updates);
    res.json({ success: true, comment });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
    await audit(req, "DELETE_COMMENT", "Comment", comment._id);
    res.json({ success: true, message: "Comment deleted" });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const getReports = async (req, res) => {
  try {
    const { page, limit, skip } = pageArgs(req.query);
    const filter = { ...dateFilter(req.query) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.targetType) filter.targetType = req.query.targetType;
    if (req.query.search) filter.reason = regex(req.query.search);
    const [items, total] = await Promise.all([
      Report.find(filter).populate("reporter", "username email").populate("resolvedBy", "username").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments(filter),
    ]);
    res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!["post", "story", "comment", "user"].includes(targetType) || !targetId || !reason) return res.status(400).json({ success: false, message: "targetType, targetId and reason are required." });
    const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason });
    res.status(201).json({ success: true, report });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const updateReport = async (req, res) => {
  try {
    const updates = {};
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.adminNote !== undefined) updates.adminNote = String(req.body.adminNote).slice(0, 2000);
    if (["resolved", "rejected"].includes(req.body.status)) { updates.resolvedBy = req.user._id; updates.resolvedAt = new Date(); }
    const report = await Report.findByIdAndUpdate(req.params.id, updates, { new: true }).populate("reporter", "username email");
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    await audit(req, "UPDATE_REPORT", "Report", report._id, updates);
    res.json({ success: true, report });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    await audit(req, "DELETE_REPORT", "Report", report._id);
    res.json({ success: true, message: "Report deleted" });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const createAdminComment = async (req, res) => {
  try {
    const { post, user, text } = req.body;
    const comment = await Comment.create({ post, user: user || req.user._id, text });
    await audit(req, "CREATE_COMMENT", "Comment", comment._id);
    res.status(201).json({ success: true, comment });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
