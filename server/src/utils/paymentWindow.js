const PAYMENT_TIME_ZONE = "Asia/Kolkata";
const START_MINUTES = 5 * 60;
const END_MINUTES = 11 * 60;

export const getIndiaTime = () => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: PAYMENT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return { hour, minute, totalMinutes: hour * 60 + minute };
};

export const isPaymentWindowOpen = () => {
  const { totalMinutes } = getIndiaTime();
  return totalMinutes >= START_MINUTES && totalMinutes < END_MINUTES;
};

export const paymentWindowMessage =
  "Payments are currently unavailable. Payment transactions are accepted only between 5:00 AM and 11:00 AM IST.";