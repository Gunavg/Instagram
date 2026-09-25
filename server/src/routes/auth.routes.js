import express from "express";
import { getProfileByUsername, getLoginHistory, login, me, register, resendLoginOtp, verifyLoginOtp } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/login/verify", verifyLoginOtp);
router.post("/login/resend", resendLoginOtp);
router.get("/me", protect, me);
router.get("/login-history", protect, getLoginHistory);
router.get("/:username", protect, getProfileByUsername);

export default router;