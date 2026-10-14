import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { enforceScheduleAllowance } from "../middleware/subscription.middleware.js";
import { createScheduledPost, listMyScheduledPosts, updateScheduledPost, cancelScheduledPost } from "../controllers/scheduledPost.controller.js";
import { uploadScheduledMedia } from "../controllers/scheduledPostUpload.controller.js";
import upload from "../middleware/storyUpload.middleware.js";

const r = express.Router();
r.use(protect);
r.post("/upload", upload.single("media"), uploadScheduledMedia);
r.post("/", enforceScheduleAllowance, createScheduledPost);
r.get("/", listMyScheduledPosts);
r.patch("/:id", updateScheduledPost);
r.delete("/:id", cancelScheduledPost);
export default r;
