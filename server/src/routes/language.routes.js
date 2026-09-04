import express from "express";
import {
  requestLanguageChange,
  resendLanguageOtp,
  updatePhoneNumber,
  verifyLanguageOtp,
} from "../controllers/language.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.post("/request", requestLanguageChange);
router.post("/resend", resendLanguageOtp);
router.post("/verify", verifyLanguageOtp);
router.patch("/phone", updatePhoneNumber);

export default router;