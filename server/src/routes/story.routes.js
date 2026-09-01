import express from "express";

import {
  createStory,
  getStories,
  getMyArchivedStories,
  deleteStory,
} from "../controllers/story.controller.js";

import {
  recordStoryView,
  getStoryAnalytics,
} from "../controllers/storyAnalytics.controller.js";

import {
  reactToStory,
  removeStoryReaction,
} from "../controllers/storyReaction.controller.js";

import { replyToStory } from "../controllers/storyReply.controller.js";
import upload from "../middleware/storyUpload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getStories);
router.get("/archive", protect, getMyArchivedStories);

router.post(
  "/",
  protect,
  upload.array("media", 10),
  createStory
);

router.delete("/:id", protect, deleteStory);
router.post("/:storyId/view", protect, recordStoryView);
router.get("/:storyId/analytics", protect, getStoryAnalytics);
router.post("/:storyId/reaction", protect, reactToStory);
router.delete("/:storyId/reaction", protect, removeStoryReaction);
router.post("/:storyId/reply", protect, replyToStory);

export default router;