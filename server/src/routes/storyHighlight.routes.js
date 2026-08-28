import express from "express";

import {
  createHighlight,
  getMyHighlights,
  addStoryToHighlight,
} from "../controllers/storyHighlight.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  getMyHighlights
);

router.post(
  "/",
  protect,
  createHighlight
);

router.post(
  "/:highlightId/stories/:storyId",
  protect,
  addStoryToHighlight
);

export default router;