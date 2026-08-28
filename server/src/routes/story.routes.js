import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createStory,
  getStories,
  deleteStory,
} from "../controllers/story.controller.js";
import upload from "../middleware/storyUpload.middleware.js";

const router = express.Router();

/*
 * Get active stories
 */
router.get("/", protect, getStories);

/*
 * Create story
 *
 * Change "media" to the field name already used
 * by your CreateStory FormData if different.
 */
router.post(
  "/",
  protect,
  upload.array("media", 10),
  createStory
);

/*
 * Delete story
 */
router.delete("/:id", protect, deleteStory);

export default router;