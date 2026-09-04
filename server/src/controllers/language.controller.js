import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import LanguageVerification from "../models/LanguageVerification.model.js";
import {
  MAX_REQUESTS_PER_WINDOW,
  MAX_RESENDS,
  MAX_VERIFY_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  REQUEST_WINDOW_MS,
  SUPPORTED_LANGUAGES,
  generateOtp,
  hashOtp,
  maskEmail,
  maskPhone,
  safeCompareOtp,
} from "../utils/languageOtp.js";
import { sendOtpEmail, sendOtpSms } from "../services/notification.service.js";

const getDelivery = (language, user) => {
  if (language === "fr") {
    return { method: "email", destination: user.email };
  }
  if (!user.phoneNumber) {
    return null;
  }
  return { method: "sms", destination: user.phoneNumber };
};

const sendCode = async ({ user, language, method, destination }) => {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const now = new Date();

  await LanguageVerification.deleteMany({ user: user._id });
  await LanguageVerification.create({
    user: user._id,
    language,
    deliveryMethod: method,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    lastSentAt: now,
  });

  if (method === "email") {
    await sendOtpEmail({ to: destination, otp, language });
  } else {
    await sendOtpSms({ to: destination, otp, language });
  }
};

export const requestLanguageChange = async (req, res) => {
  try {
    const { language } = req.body;
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, message: "Unsupported language." });
    }

    const user = await User.findById(req.user._id).select("email phoneNumber language username");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.language === language) {
      return res.status(200).json({ success: true, verified: true, language, message: "Language is already selected." });
    }

    const delivery = getDelivery(language, user);
    if (!delivery) {
      return res.status(400).json({
        success: false,
        code: "PHONE_REQUIRED",
        message: "Add a registered mobile number before selecting this language.",
      });
    }

    const since = new Date(Date.now() - REQUEST_WINDOW_MS);
    const requestCount = await LanguageVerification.countDocuments({ user: user._id, createdAt: { $gte: since } });
    if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({ success: false, message: "Too many OTP requests. Please try again later." });
    }

    const existing = await LanguageVerification.findOne({ user: user._id });
    if (existing && Date.now() - existing.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: "Please wait before requesting another OTP." });
    }

    await sendCode({ user, language, ...delivery });
    return res.status(200).json({
      success: true,
      verified: false,
      language,
      deliveryMethod: delivery.method,
      destination: delivery.method === "email" ? maskEmail(delivery.destination) : maskPhone(delivery.destination),
      expiresInSeconds: OTP_TTL_MS / 1000,
      message: `Verification code sent by ${delivery.method === "email" ? "email" : "SMS"}.`,
    });
  } catch (error) {
    console.error("Language OTP request error:", error);
    return res.status(500).json({ success: false, message: error.message || "Unable to send verification code." });
  }
};

export const resendLanguageOtp = async (req, res) => {
  try {
    const verification = await LanguageVerification.findOne({ user: req.user._id });
    if (!verification) return res.status(400).json({ success: false, message: "No pending language change." });
    if (verification.resendCount >= MAX_RESENDS) {
      return res.status(429).json({ success: false, message: "Resend limit reached. Start a new language change later." });
    }
    if (Date.now() - verification.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: "Please wait 60 seconds before resending." });
    }

    const user = await User.findById(req.user._id).select("email phoneNumber");
    const delivery = getDelivery(verification.language, user);
    if (!delivery) return res.status(400).json({ success: false, code: "PHONE_REQUIRED", message: "Add a registered mobile number first." });

    const otp = generateOtp();
    verification.otpHash = hashOtp(otp);
    verification.expiresAt = new Date(Date.now() + OTP_TTL_MS);
    verification.lastSentAt = new Date();
    verification.attempts = 0;
    verification.resendCount += 1;
    verification.deliveryMethod = delivery.method;
    await verification.save();

    if (delivery.method === "email") await sendOtpEmail({ to: delivery.destination, otp, language: verification.language });
    else await sendOtpSms({ to: delivery.destination, otp, language: verification.language });

    return res.status(200).json({ success: true, expiresInSeconds: OTP_TTL_MS / 1000, message: "A new verification code was sent." });
  } catch (error) {
    console.error("Language OTP resend error:", error);
    return res.status(500).json({ success: false, message: error.message || "Unable to resend verification code." });
  }
};

export const verifyLanguageOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({ success: false, message: "Enter the 6-digit verification code." });
    }

    const verification = await LanguageVerification.findOne({ user: req.user._id });
    if (!verification) return res.status(400).json({ success: false, message: "No pending language verification." });
    if (verification.expiresAt.getTime() <= Date.now()) {
      await verification.deleteOne();
      return res.status(400).json({ success: false, code: "OTP_EXPIRED", message: "The verification code has expired. Request a new code." });
    }
    if (verification.attempts >= MAX_VERIFY_ATTEMPTS) {
      await verification.deleteOne();
      return res.status(429).json({ success: false, code: "ATTEMPTS_EXCEEDED", message: "Too many failed attempts. Request a new code later." });
    }

    if (!safeCompareOtp(String(otp), verification.otpHash)) {
      verification.attempts += 1;
      await verification.save();
      const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - verification.attempts);
      return res.status(400).json({ success: false, code: "INVALID_OTP", attemptsRemaining: remaining, message: remaining ? `Invalid code. ${remaining} attempt(s) remaining.` : "Invalid code. Verification is locked." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    user.language = verification.language;
    await user.save();
    await verification.deleteOne();

    return res.status(200).json({ success: true, language: user.language, user, message: "Language updated successfully." });
  } catch (error) {
    console.error("Language OTP verification error:", error);
    return res.status(500).json({ success: false, message: error.message || "Unable to verify code." });
  }
};

export const updatePhoneNumber = async (req, res) => {
  try {
    const phoneNumber = String(req.body.phoneNumber || "").trim();
    if (!/^\+?[1-9]\d{7,14}$/.test(phoneNumber)) {
      return res.status(400).json({ success: false, message: "Enter a valid mobile number with country code." });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { phoneNumber }, { new: true }).select("-password -refreshToken");
    return res.status(200).json({ success: true, user, message: "Mobile number saved successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to save mobile number." });
  }
};
