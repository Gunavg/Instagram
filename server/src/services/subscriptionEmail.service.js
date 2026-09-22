import axios from "axios";

export const sendSubscriptionEmail = async ({ user, subscription, eventType }) => {
  if (!process.env.RESEND_API_KEY || !process.env.OTP_FROM_EMAIL) {
    console.warn("Subscription email skipped: RESEND_API_KEY / OTP_FROM_EMAIL is not configured.");
    return null;
  }

  const subject = eventType === "renewal"
    ? "Your InstAI subscription has renewed"
    : "Your InstAI subscription is active";
  const format = (date) => date
    ? date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : "N/A";
  const text = `Hello ${user.fullName},\n\n${eventType === "renewal" ? "Your subscription has been renewed successfully." : "Your subscription payment was successful and your subscription is now active."}\n\nPlan: ${subscription.plan.toUpperCase()}\nAmount: ₹${subscription.amount}/month\nValidity: ${format(subscription.currentPeriodStart)} to ${format(subscription.currentPeriodEnd)}\nNext renewal date: ${format(subscription.nextRenewalDate)}\nInvoice ID: ${subscription.latestInvoiceId || "Available in your payment receipt"}\n\nThank you for using InstAI.`;

  const invoiceLink = subscription.latestInvoiceUrl ? `\nInvoice: ${subscription.latestInvoiceUrl}` : "";\n  const response = await axios.post("https://api.resend.com/emails", {\n    from: process.env.OTP_FROM_EMAIL,\n    to: [user.email],\n    subject,\n    text: text + invoiceLink,\n  }, {
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
};