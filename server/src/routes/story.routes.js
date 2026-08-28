import express from "express";

import {
  createStory,
  getStories,
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

import {
  replyToStory,
} from "../controllers/storyReply.controller.js";

import upload from "../middleware/storyUpload.middleware.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/*
 * Active stories.
 */
router.get(
  "/",
  protect,
  getStories
);

/*
 * Create story.
 */
router.post(
  "/",
  protect,
  upload.array("media", 10),
  createStory
);

/*
 * Delete own story.
 */
router.delete(
  "/:id",
  protect,
  deleteStory
);

/*
 * Record view.
 */
router.post(
  "/:storyId/view",
  protect,
  recordStoryView
);

/*
 * Analytics dashboard.
 */
router.get(
  "/:storyId/analytics",
  protect,
  getStoryAnalytics
);

/*
 * Reaction.
 */
router.post(
  "/:storyId/reaction",
  protect,
  reactToStory
);

/*
 * Remove reaction.
 */
router.delete(
  "/:storyId/reaction",
  protect,
  removeStoryReaction
);

/*
 * Reply.
 */
router.post(
  "/:storyId/reply",
  protect,
  replyToStory
);

export default router;