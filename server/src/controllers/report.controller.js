import Report from "../models/Report.model.js";

export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!["post", "story", "comment", "user"].includes(targetType) || !targetId || !String(reason || "").trim()) {
      return res.status(400).json({ success: false, message: "targetType, targetId and reason are required." });
    }
    const existing = await Report.findOne({ reporter: req.user._id, targetType, targetId, status: { $in: ["pending", "reviewed"] } });
    if (existing) return res.status(409).json({ success: false, message: "You already have an active report for this content." });
    const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason: String(reason).trim().slice(0, 500) });
    res.status(201).json({ success: true, message: "Report submitted successfully.", report });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, reports });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
