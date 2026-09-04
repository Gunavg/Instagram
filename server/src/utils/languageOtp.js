import crypto from "crypto";

export const SUPPORTED_LANGUAGES = ["en", "es", "hi", "pt", "zh", "fr"];
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;
export const MAX_RESENDS = 5;
export const REQUEST_WINDOW_MS = 60 * 60 * 1000;
export const MAX_REQUESTS_PER_WINDOW = 10;

export const generateOtp = () =>
  crypto.randomInt(100000, 1000000).toString();

export const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

export const safeCompareOtp = (otp, hash) => {
  const incoming = Buffer.from(hashOtp(otp), "hex");
  const stored = Buffer.from(hash, "hex");
  return incoming.length === stored.length && crypto.timingSafeEqual(incoming, stored);
};

export const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  if (!domain) return "your email";
  return `${name.slice(0, 2)}***@${domain}`;
};

export const maskPhone = (phone) => {
  if (!phone) return "your mobile number";
  return `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
};