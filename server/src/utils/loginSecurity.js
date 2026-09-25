import crypto from "crypto";

export const LOGIN_OTP_TTL_MS = 5 * 60 * 1000;
export const LOGIN_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const LOGIN_MAX_VERIFY_ATTEMPTS = 5;
export const LOGIN_MAX_RESENDS = 5;
export const LOGIN_REQUEST_WINDOW_MS = 60 * 60 * 1000;
export const LOGIN_MAX_OTP_REQUESTS_PER_WINDOW = 10;
export const MOBILE_LOGIN_START_MINUTES = 10 * 60;
export const MOBILE_LOGIN_END_MINUTES = 13 * 60;

export const detectBrowser = (userAgent = "") => {
  const ua = userAgent.toLowerCase();
  if (/edg\//i.test(ua)) return "Microsoft Edge";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Google Chrome";
  if (/firefox\//i.test(ua)) return "Mozilla Firefox";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Apple Safari";
  return "Other";
};

export const detectOperatingSystem = (userAgent = "") => {
  const ua = userAgent.toLowerCase();
  if (/windows nt/i.test(ua)) return "Windows";
  if (/android/i.test(ua)) return "Android";
  if (/(iphone|ipad|ipod)/i.test(ua)) return "iOS";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
};

export const detectDeviceType = (userAgent = "") => {
  const ua = userAgent.toLowerCase();
  if (/(iphone|ipad|ipod|android|mobile)/i.test(ua)) return "Mobile";
  return "Desktop";
};

export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const candidate = raw ? String(raw).split(",")[0].trim() : req.ip || req.socket?.remoteAddress || "";
  return candidate.replace(/^::ffff:/, "") || "Unknown";
};

export const getServerTime = () => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute, totalMinutes: hour * 60 + minute };
};

export const isMobileLoginWindowOpen = () => {
  const { totalMinutes } = getServerTime();
  return totalMinutes >= MOBILE_LOGIN_START_MINUTES && totalMinutes < MOBILE_LOGIN_END_MINUTES;
};

export const generateLoginOtp = () => crypto.randomInt(100000, 1000000).toString();
export const hashLoginOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
export const safeCompareLoginOtp = (otp, hash) => {
  const incoming = Buffer.from(hashLoginOtp(otp), "hex");
  const stored = Buffer.from(hash || "", "hex");
  return incoming.length === stored.length && crypto.timingSafeEqual(incoming, stored);
};
export const maskLoginEmail = (email = "") => {
  const [name, domain] = email.split("@");
  return domain ? `${name.slice(0, 2)}***@${domain}` : "your email";
};