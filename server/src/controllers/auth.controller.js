import User from "../models/User.model.js";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import Post from "../models/Post.model.js";
import Like from "../models/Like.model.js";
import LoginHistory from "../models/LoginHistory.model.js";
import LoginChallenge from "../models/LoginChallenge.model.js";
import {
  detectBrowser,
  detectOperatingSystem,
  detectDeviceType,
  getClientIp,
  isMobileLoginWindowOpen,
  getServerTime,
  generateLoginOtp,
  hashLoginOtp,
  safeCompareLoginOtp,
  maskLoginEmail,
  LOGIN_OTP_TTL_MS,
  LOGIN_OTP_RESEND_COOLDOWN_MS,
  LOGIN_MAX_VERIFY_ATTEMPTS,
  LOGIN_MAX_RESENDS,
  LOGIN_REQUEST_WINDOW_MS,
  LOGIN_MAX_OTP_REQUESTS_PER_WINDOW,
} from "../utils/loginSecurity.js";
import { sendOtpEmail } from "../services/notification.service.js";

const getDeviceTypeForLogging = (userAgent = "") => {
  const detected = detectDeviceType(userAgent);
  if (detected === "Mobile") return "Mobile";
  return /laptop/i.test(userAgent) ? "Laptop" : "Desktop";
};

const getRequestContext = (req) => {
  const userAgent = String(req.headers["user-agent"] || "");
  return {
    userAgent,
    browser: detectBrowser(userAgent),
    operatingSystem: detectOperatingSystem(userAgent),
    deviceType: getDeviceTypeForLogging(userAgent),
    ipAddress: getClientIp(req),
  };
};

const logAttempt = async ({ userId = null, attemptedEmail = "", context, status, failureReason = "", verificationMethod = "none" }) => {
  try {
    await LoginHistory.create({
      user: userId || null,
      attemptedEmail: String(attemptedEmail || "").trim().toLowerCase(),
      browser: context.browser,
      operatingSystem: context.operatingSystem,
      deviceType: context.deviceType,
      ipAddress: context.ipAddress,
      loginAt: new Date(),
      status,
      failureReason,
      verificationMethod,
    });
  } catch (error) {
    console.error("Login history write failed:", error.message);
  }
};

const issueSession = async (user, context, verificationMethod = "none") => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();
  await logAttempt({ userId: user._id, context, status: "success", verificationMethod });
  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { username, fullName, email, password, profilePicture, phoneNumber } = req.body;
    if (!username || !fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "ALL fields are required" });
    }
    const exisitngUser = await User.findOne({ $or: [{ email }, { username }] });
    if (exisitngUser) {
      return res.status(400).json({ success: false, message: "User already exisits" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      fullName,
      email,
      password: hashedPassword,
      profilePicture,
      phoneNumber: phoneNumber || "",
    });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    res.status(201).json({ success: true, message: "User Created Successfully", accessToken, user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  const context = getRequestContext(req);
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "ALL fields are required" });
    }

    const user = await User.findOne({ email }).select("+password +refreshToken");
    if (!user) {
      await logAttempt({
        attemptedEmail: email,
        context,
        status: "failed",
        failureReason: "Invalid email or account not found",
      });
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAttempt({ userId: user._id, context, status: "failed", failureReason: "Invalid password" });
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (context.deviceType === "Mobile" && !isMobileLoginWindowOpen()) {
      const { hour, minute } = getServerTime();
      await logAttempt({
        userId: user._id,
        context,
        status: "failed",
        failureReason: "Mobile login outside permitted 10:00 AM–1:00 PM server time",
      });
      return res.status(403).json({
        success: false,
        code: "MOBILE_LOGIN_WINDOW_CLOSED",
        message: `Mobile login is allowed only between 10:00 AM and 1:00 PM server time. Current server time: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}.`,
      });
    }

    if (context.browser === "Google Chrome") {
      if (!user.email) {
        await logAttempt({ userId: user._id, context, status: "failed", failureReason: "Registered email is missing for Chrome verification" });
        return res.status(400).json({ success: false, message: "A registered email address is required for Chrome verification." });
      }

      const since = new Date(Date.now() - LOGIN_REQUEST_WINDOW_MS);
      const requestCount = await LoginChallenge.countDocuments({ user: user._id, createdAt: { $gte: since } });
      if (requestCount >= LOGIN_MAX_OTP_REQUESTS_PER_WINDOW) {
        await logAttempt({ userId: user._id, context, status: "failed", failureReason: "Too many Chrome OTP requests" });
        return res.status(429).json({ success: false, message: "Too many verification requests. Please try again later." });
      }

      const existing = await LoginChallenge.findOne({ user: user._id });
      if (existing && Date.now() - existing.lastSentAt.getTime() < LOGIN_OTP_RESEND_COOLDOWN_MS) {
        await logAttempt({ userId: user._id, context, status: "failed", failureReason: "Chrome OTP resend cooldown active" });
        return res.status(429).json({ success: false, message: "Please wait before requesting another verification code." });
      }

      const otp = generateLoginOtp();
      await LoginChallenge.deleteMany({ user: user._id });
      await LoginChallenge.create({
        user: user._id,
        otpHash: hashLoginOtp(otp),
        expiresAt: new Date(Date.now() + LOGIN_OTP_TTL_MS),
        lastSentAt: new Date(),
        userAgent: context.userAgent,
        browser: context.browser,
        operatingSystem: context.operatingSystem,
        deviceType: context.deviceType,
        ipAddress: context.ipAddress,
      });
      await sendOtpEmail({ to: user.email, otp, language: user.language || "en" });

      return res.status(200).json({
        success: true,
        requiresOtp: true,
        challengeType: "chrome_email",
        message: "A verification code has been sent to your registered email address.",
        destination: maskLoginEmail(user.email),
        expiresInSeconds: LOGIN_OTP_TTL_MS / 1000,
        user: { _id: user._id, username: user.username, fullName: user.fullName, email: user.email, language: user.language, profilePicture: user.profilePicture },
      });
    }

    const session = await issueSession(user, context, "none");
    return res.status(200).json({
      success: true,
      requiresOtp: false,
      message: "Login successful",
      user: { _id: user._id, username: user.username, fullName: user.fullName, email: user.email, language: user.language, profilePicture: user.profilePicture },
      accessToken: session.accessToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    await logAttempt({ attemptedEmail: email, context, status: "failed", failureReason: "Server error during login" });
    return res.status(500).json({ success: false, message: "Unable to complete login right now." });
  }
};

export const verifyLoginOtp = async (req, res) => {
  const context = getRequestContext(req);
  try {
    const otp = String(req.body?.otp || "");
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: "Enter the 6-digit verification code." });

    const challenge = await LoginChallenge.findOne({ user: req.body?.userId });
    if (!challenge) return res.status(400).json({ success: false, message: "No pending Chrome verification. Please log in again." });

    if (challenge.browser !== context.browser || challenge.ipAddress !== context.ipAddress || challenge.userAgent !== context.userAgent) {
      await logAttempt({ userId: challenge.user, context, status: "failed", failureReason: "Login verification context changed", verificationMethod: "email_otp" });
      return res.status(403).json({ success: false, message: "Login verification must be completed from the same browser session." });
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await challenge.deleteOne();
      return res.status(400).json({ success: false, code: "OTP_EXPIRED", message: "The verification code has expired. Please log in again." });
    }
    if (challenge.attempts >= LOGIN_MAX_VERIFY_ATTEMPTS) {
      await challenge.deleteOne();
      return res.status(429).json({ success: false, code: "ATTEMPTS_EXCEEDED", message: "Too many failed attempts. Please log in again later." });
    }
    if (challenge.browser !== "Google Chrome") {
      await challenge.deleteOne();
      return res.status(400).json({ success: false, message: "Invalid login verification context." });
    }

    if (!safeCompareLoginOtp(otp, challenge.otpHash)) {
      challenge.attempts += 1;
      await challenge.save();
      const remaining = Math.max(0, LOGIN_MAX_VERIFY_ATTEMPTS - challenge.attempts);
      await logAttempt({ userId: challenge.user, context, status: "failed", failureReason: `Invalid Chrome OTP (${challenge.attempts} failed attempt(s))`, verificationMethod: "email_otp" });
      return res.status(400).json({ success: false, code: "INVALID_OTP", attemptsRemaining: remaining, message: remaining ? `Invalid code. ${remaining} attempt(s) remaining.` : "Invalid code. Verification is locked." });
    }

    const user = await User.findById(challenge.user).select("+password +refreshToken");
    if (!user) {
      await challenge.deleteOne();
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const challengeDevice = getDeviceTypeForLogging(challenge.userAgent);
    if (challengeDevice === "Mobile" && !isMobileLoginWindowOpen()) {
      await challenge.deleteOne();
      await logAttempt({ userId: user._id, context, status: "failed", failureReason: "Mobile login outside permitted window during OTP verification", verificationMethod: "email_otp" });
      return res.status(403).json({ success: false, code: "MOBILE_LOGIN_WINDOW_CLOSED", message: "Mobile login is allowed only between 10:00 AM and 1:00 PM server time." });
    }

    const session = await issueSession(user, {
      ...context,
      browser: challenge.browser,
      operatingSystem: challenge.operatingSystem,
      deviceType: challenge.deviceType,
      ipAddress: challenge.ipAddress,
    }, "email_otp");
    await challenge.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: { _id: user._id, username: user.username, fullName: user.fullName, email: user.email, language: user.language, profilePicture: user.profilePicture },
      accessToken: session.accessToken,
    });
  } catch (error) {
    console.error("Login OTP verification error:", error);
    return res.status(500).json({ success: false, message: "Unable to verify login code right now." });
  }
};

export const resendLoginOtp = async (req, res) => {
  try {
    const challenge = await LoginChallenge.findOne({ user: req.body?.userId });
    if (!challenge) return res.status(400).json({ success: false, message: "No pending Chrome verification. Please log in again." });
    if (challenge.browser !== "Google Chrome") return res.status(400).json({ success: false, message: "Invalid verification context." });
    if (challenge.resendCount >= LOGIN_MAX_RESENDS) {
      return res.status(429).json({ success: false, message: "Verification resend limit reached. Please log in again later." });
    }
    if (Date.now() - challenge.lastSentAt.getTime() < LOGIN_OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: "Please wait 60 seconds before requesting another code." });
    }

    const context = getRequestContext(req);
    if (context.browser !== challenge.browser || context.ipAddress !== challenge.ipAddress || context.userAgent !== challenge.userAgent) {
      return res.status(403).json({ success: false, message: "Login verification must be continued from the same browser session." });
    }
    if (challenge.deviceType === "Mobile" && !isMobileLoginWindowOpen()) {
      return res.status(403).json({ success: false, code: "MOBILE_LOGIN_WINDOW_CLOSED", message: "Mobile login is allowed only between 10:00 AM and 1:00 PM server time." });
    }

    const user = await User.findById(challenge.user).select("email language");
    if (!user?.email) return res.status(400).json({ success: false, message: "Registered email address is unavailable." });

    const otp = generateLoginOtp();
    challenge.otpHash = hashLoginOtp(otp);
    challenge.expiresAt = new Date(Date.now() + LOGIN_OTP_TTL_MS);
    challenge.lastSentAt = new Date();
    challenge.attempts = 0;
    challenge.resendCount += 1;
    await challenge.save();
    await sendOtpEmail({ to: user.email, otp, language: user.language || "en" });
    return res.status(200).json({ success: true, expiresInSeconds: LOGIN_OTP_TTL_MS / 1000, message: "A new verification code was sent." });
  } catch (error) {
    console.error("Login OTP resend error:", error);
    return res.status(500).json({ success: false, message: "Unable to resend verification code right now." });
  }
};

export const getLoginHistory = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const history = await LoginHistory.find({ user: req.user._id })
      .sort({ loginAt: -1 })
      .limit(limit)
      .lean();
    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error("Login history fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load login history." });
  }
};

export const me = async (req, res) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select("-password -refreshToken");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const posts = await Post.find({ user: user._id, isDeleted: false }).sort({ createdAt: -1 }).lean();
    const postIds = posts.map((post) => post._id);
    const likes = await Like.find({ post: { $in: postIds } }).populate("user", "username fullName profilePicture");
    const likesMap = {};
    likes.forEach((like) => {
      const postId = like.post.toString();
      if (!likesMap[postId]) likesMap[postId] = [];
      likesMap[postId].push(like);
    });
    const postsWithLikes = posts.map((post) => ({ ...post, likes: likesMap[post._id.toString()] || [] }));
    res.status(200).json({ success: true, user, posts: postsWithLikes });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};