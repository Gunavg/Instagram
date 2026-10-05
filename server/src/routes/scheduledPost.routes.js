import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { enforceScheduleAllowance } from "../middleware/subscription.middleware.js";
import { createScheduledPost, listMyScheduledPosts, updateScheduledPost, cancelScheduledPost } from "../controllers/scheduledPost.controller.js";

const r = express.Router();
r.use(protect);
r.post("/", enforceScheduleAllowance, createScheduledPost);
r.get("/", listMyScheduledPosts);
r.patch("/:id", updateScheduledPost);
r.delete("/:id", cancelScheduledPost);
export default r;
