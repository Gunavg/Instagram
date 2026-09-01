import express from "express";

import {
  createHighlight,
  getMyHighlights,
  getHighlightById,
  addStoryToHighlight,
  removeStoryFromHighlight,
  deleteHighlight,
} from "../controllers/storyHighlight.controller.js";

import {
  protect,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/*
 * ============================================================
 * GET MY HIGHLIGHTS
 * ============================================================
 */
router.get(
  "/",
  protect,
  getMyHighlights
);

/*
 * ============================================================
 * CREATE HIGHLIGHT
 * ============================================================
 */
router.post(
  "/",
  protect,
  createHighlight
);

/*
 * ============================================================
 * GET SINGLE HIGHLIGHT
 * ============================================================
 */
router.get(
  "/:highlightId",
  protect,
  getHighlightById
);

/*
 * ============================================================
 * ADD STORY
 * ============================================================
 */
router.post(
  "/:highlightId/stories/:storyId",
  protect,
  addStoryToHighlight
);

/*
 * ============================================================
 * REMOVE STORY
 * ============================================================
 */
router.delete(
  "/:highlightId/stories/:storyId",
  protect,
  removeStoryFromHighlight
);

/*
 * ============================================================
 * DELETE HIGHLIGHT
 * ============================================================
 */
router.delete(
  "/:highlightId",
  protect,
  deleteHighlight
);

export default router;