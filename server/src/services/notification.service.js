import axios from "axios";

export const sendOtpEmail = async ({ to, otp, language }) => {
  if (!process.env.RESEND_API_KEY || !process.env.OTP_FROM_EMAIL) {
    throw new Error("Email OTP service is not configured. Set RESEND_API_KEY and OTP_FROM_EMAIL.");
  }

  const response = await axios.post(
    "https://api.resend.com/emails",
    {
      from: process.env.OTP_FROM_EMAIL,
      to: [to],
      subject: "Your InstAI language verification code",
      text: `Your InstAI verification code is ${otp}. It expires in 5 minutes. Requested language: ${language}. If you did not request this change, ignore this email.`,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};

export const sendOtpSms = async ({ to, otp, language }) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error("SMS OTP service is not configured. Set Twilio environment variables.");
  }

  const body = new URLSearchParams({
    To: to,
    From: TWILIO_FROM_NUMBER,
    Body: `InstAI verification code: ${otp}. Expires in 5 minutes. Language: ${language}.`,
  });

  const response = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    body.toString(),
    {
      auth: {
        username: TWILIO_ACCOUNT_SID,
        password: TWILIO_AUTH_TOKEN,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  return response.data;
};
