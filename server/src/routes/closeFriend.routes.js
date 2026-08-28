import express from "express";

import {
  addCloseFriend,
  removeCloseFriend,
  getCloseFriends,
} from "../controllers/closeFriend.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  getCloseFriends
);

router.post(
  "/:userId",
  protect,
  addCloseFriend
);

router.delete(
  "/:userId",
  protect,
  removeCloseFriend
);

export default router;