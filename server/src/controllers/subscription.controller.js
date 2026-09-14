import Stripe from "stripe";
import Subscription from "../models/Subscription.model.js";
import Payment from "../models/Payment.model.js";
import { SUBSCRIPTION_PLANS } from "../config/subscriptionPlans.js";
import {
  cancelUserSubscription,
  createCheckoutSession,
  syncSubscriptionFromStripe,
  verifyCheckoutSession,
} from "../services/subscription.service.js";
import { isPaymentWindowOpen, paymentWindowMessage } from "../utils/paymentWindow.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-07-30.basil" });

export const getPlans = async (req, res) => {
  return res.json({ success: true, plans: SUBSCRIPTION_PLANS });
};

export const getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    const data = subscription || {
      plan: "free",
      status: "active",
      amount: 0,
      nextRenewalDate: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      lastPaymentStatus: "",
    };
    return res.json({ success: true, subscription: data, planDetails: SUBSCRIPTION_PLANS[data.plan] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubscriptionCheckout = async (req, res) => {
  try {
    if (!isPaymentWindowOpen()) {
      return res.status(403).json({ success: false, code: "PAYMENT_WINDOW_CLOSED", message: paymentWindowMessage });
    }

    const { plan } = req.body;
    if (!plan || !SUBSCRIPTION_PLANS[plan] || plan === "free") {
      return res.status(400).json({ success: false, message: "Select a valid paid subscription plan." });
    }

    const origin = process.env.CLIENT_URL || "http://localhost:3000";
    const session = await createCheckoutSession({ user: req.user, plan, origin });
    return res.status(201).json({ success: true, checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Subscription checkout error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const verifySubscriptionCheckout = async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.body.sessionId;
    if (!sessionId) return res.status(400).json({ success: false, message: "Checkout session ID is required." });

    const session = await verifyCheckoutSession(sessionId, req.user._id);
    if (session.payment_status !== "paid" || !session.subscription) {
      return res.status(400).json({ success: false, message: "Payment has not been completed yet." });
    }

    const stripeSubscription = typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;
    const subscription = await syncSubscriptionFromStripe(stripeSubscription);
    return res.json({ success: true, subscription });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const subscription = await cancelUserSubscription(req.user._id);
    return res.json({ success: true, message: "Subscription cancellation scheduled for the end of the current billing period.", subscription });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const stripeWebhook = async (req, res) => {
  let event;
  try {
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscriptionFromStripe(stripeSubscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscriptionFromStripe(event.data.object);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const subscription = await syncSubscriptionFromStripe(stripeSubscription);
          const payment = await Payment.findOneAndUpdate(
            { stripeInvoiceId: invoice.id },
            {
              user: subscription?.user,
              subscription: subscription?._id,
              plan: subscription?.plan || "bronze",
              amount: (invoice.amount_paid || 0) / 100,
              currency: invoice.currency || "inr",
              status: "paid",
              stripeInvoiceId: invoice.id,
              stripePaymentIntentId: typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id || "",
              paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(),
              receiptUrl: invoice.hosted_invoice_url || "",
            },
            { new: true, upsert: true },
          );
          if (subscription && invoice.id) {
            subscription.latestInvoiceId = invoice.id;
            subscription.latestPaymentIntentId = payment?.stripePaymentIntentId || "";
            subscription.lastPaymentStatus = "paid";
            subscription.lastPaymentAt = payment?.paidAt || new Date();
            await subscription.save();
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const subscription = await syncSubscriptionFromStripe(stripeSubscription, { sendEmail: false });
          if (subscription) {
            subscription.status = stripeSubscription.status === "active" ? "active" : "past_due";
            subscription.lastPaymentStatus = "failed";
            subscription.lastPaymentAt = new Date();
            subscription.latestInvoiceId = invoice.id || "";
            await subscription.save();
          }
          await Payment.findOneAndUpdate(
            { stripeInvoiceId: invoice.id },
            {
              user: subscription?.user,
              subscription: subscription?._id,
              plan: subscription?.plan || "bronze",
              amount: (invoice.amount_due || 0) / 100,
              currency: invoice.currency || "inr",
              status: "failed",
              failureReason: "Stripe reported a failed recurring payment.",
              stripeInvoiceId: invoice.id || "",
            },
            { upsert: true, new: true },
          );
        }
        break;
      }
      default:
        break;
    }
    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return res.status(500).json({ received: false });
  }
};
