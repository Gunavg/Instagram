import Story from "../models/Story.model.js";
import AdminAuditLog from "../models/AdminAuditLog.model.js";

export const updateStory = async (req,res) => {
  try {
    const updates = {};
    if (req.body.privacy !== undefined) updates.privacy = req.body.privacy;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.expiresAt !== undefined) updates.expiresAt = new Date(req.body.expiresAt);
    const story = await Story.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!story) return res.status(404).json({ success:false, message:"Story not found" });
    await AdminAuditLog.create({ admin:req.user._id, action:"UPDATE_STORY", entityType:"Story", entityId:story._id, targetUser:story.user, metadata:updates, ipAddress:req.ip, userAgent:req.headers["user-agent"]||"" });
    res.json({ success:true, story });
  } catch(error) { res.status(400).json({ success:false, message:error.message }); }
};
