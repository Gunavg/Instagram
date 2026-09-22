import Stripe from "stripe";
import Subscription from "../models/Subscription.model.js";
import Payment from "../models/Payment.model.js";
import User from "../models/User.model.js";
import { SUBSCRIPTION_PLANS } from "../config/subscriptionPlans.js";
import { sendSubscriptionEmail } from "./subscriptionEmail.service.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-07-30.basil",
});

const toDate = (seconds) => (seconds ? new Date(seconds * 1000) : null);

export const assertStripeConfigured = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  if (!process.env.STRIPE_BRONZE_PRICE_ID || !process.env.STRIPE_SILVER_PRICE_ID || !process.env.STRIPE_GOLD_PRICE_ID) {
    throw new Error("Stripe price IDs are not configured for all paid plans.");
  }
};

export const priceIdForPlan = (plan) => ({ bronze: process.env.STRIPE_BRONZE_PRICE_ID, silver: process.env.STRIPE_SILVER_PRICE_ID, gold: process.env.STRIPE_GOLD_PRICE_ID }[plan]);

export const syncSubscriptionFromStripe = async (stripeSubscription, { sendEmail = true } = {}) => {
  const userId = stripeSubscription.metadata?.userId;
  const plan = stripeSubscription.metadata?.plan;
  if (!userId || !plan || !SUBSCRIPTION_PLANS[plan]) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  const existing = await Subscription.findOne({ user: userId });
  const previousStatus = existing?.status;
  const previousPeriodEnd = existing?.currentPeriodEnd?.getTime();
  const item = stripeSubscription.items?.data?.[0];
  const periodStart = toDate(stripeSubscription.current_period_start);
  const periodEnd = toDate(stripeSubscription.current_period_end);

  const subscription = await Subscription.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      plan,
      status: stripeSubscription.status === "active" ? "active" : stripeSubscription.status,
      stripeCustomerId: typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : stripeSubscription.customer?.id || "",
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: item?.price?.id || priceIdForPlan(plan),
      amount: SUBSCRIPTION_PLANS[plan].amount,
      currency: "inr",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextRenewalDate: periodEnd,
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
      canceledAt: stripeSubscription.canceled_at ? toDate(stripeSubscription.canceled_at) : null,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const isNewActivation = subscription.status === "active" && (previousStatus !== "active" || !existing);
  const isRenewal = subscription.status === "active" && previousStatus === "active" && previousPeriodEnd !== periodEnd?.getTime();
  if (sendEmail && (isNewActivation || isRenewal)) await sendSubscriptionEmail({ user, subscription, eventType: isRenewal ? "renewal" : "payment" });
  return subscription;
};

export const createCheckoutSession = async ({ user, plan, origin }) => {
  assertStripeConfigured();
  const priceId = priceIdForPlan(plan);
  if (!SUBSCRIPTION_PLANS[plan] || plan === "free" || !priceId) throw new Error("Invalid subscription plan.");

  let subscription = await Subscription.findOne({ user: user._id });
  let customerId = subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.fullName, metadata: { userId: user._id.toString() } });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/subscription?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscription?payment=cancelled`,
    client_reference_id: user._id.toString(),
    metadata: { userId: user._id.toString(), plan },
    subscription_data: { metadata: { userId: user._id.toString(), plan } },
  });

  subscription = await Subscription.findOneAndUpdate(
    { user: user._id },
    { user: user._id, plan, stripeCustomerId: customerId, stripePriceId: priceId, status: "incomplete", amount: SUBSCRIPTION_PLANS[plan].amount, currency: "inr" },
    { upsert: true, new: true },
  );

  await Payment.create({ user: user._id, subscription: subscription._id, plan, amount: SUBSCRIPTION_PLANS[plan].amount, currency: "inr", stripeCheckoutSessionId: session.id });
  return session;
};

export const verifyCheckoutSession = async (sessionId, userId) => {
  assertStripeConfigured();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  if (session.client_reference_id !== userId.toString()) throw new Error("This payment does not belong to the current user.");
  return session;
};

export const cancelUserSubscription = async (userId) => {
  assertStripeConfigured();
  const subscription = await Subscription.findOne({ user: userId });
  if (!subscription?.stripeSubscriptionId) throw new Error("No active paid subscription found.");
  const canceled = await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
  return syncSubscriptionFromStripe(canceled, { sendEmail: false });
};

export const clearExpiredSubscription = async (subscription) => {
  if (!subscription || subscription.plan === "free") return subscription;
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd <= new Date() && subscription.status !== "active") {
    return Subscription.findOneAndUpdate({ user: subscription.user }, { plan: "free", status: "active", stripeSubscriptionId: "", stripePriceId: "", nextRenewalDate: null, currentPeriodStart: null, currentPeriodEnd: null }, { new: true });
  }
  return subscription;
};