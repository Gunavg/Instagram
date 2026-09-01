import express from "express";

import {
  createHighlight,
  getMyHighlights,
  getHighlightById,
  getHighlightAnalytics,
  addStoryToHighlight,
  removeStoryFromHighlight,
  deleteHighlight,
} from "../controllers/storyHighlight.controller.js";

import {
  protect,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/* GET MY HIGHLIGHTS */
router.get(
  "/",
  protect,
  getMyHighlights
);

/* CREATE HIGHLIGHT */
router.post(
  "/",
  protect,
  createHighlight
);

/*
 * GET HIGHLIGHT ANALYTICS
 *
 * Keep this route before /:highlightId so the literal
 * "analytics" path is never treated as a highlight ID.
 */
router.get(
  "/:highlightId/analytics",
  protect,
  getHighlightAnalytics
);

/* GET SINGLE HIGHLIGHT */
router.get(
  "/:highlightId",
  protect,
  getHighlightById
);

/* ADD STORY */
router.post(
  "/:highlightId/stories/:storyId",
  protect,
  addStoryToHighlight
);

/* REMOVE STORY */
router.delete(
  "/:highlightId/stories/:storyId",
  protect,
  removeStoryFromHighlight
);

/* DELETE HIGHLIGHT */
router.delete(
  "/:highlightId",
  protect,
  deleteHighlight
);

export default router;