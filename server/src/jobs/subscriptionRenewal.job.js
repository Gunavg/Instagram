import Subscription from "../models/Subscription.model.js";
import { syncSubscriptionFromStripe, assertStripeConfigured } from "../services/subscription.service.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-07-30.basil" });

export const startSubscriptionRenewalJob = () => {
  const intervalMs = 60 * 60 * 1000;
  const check = async () => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return;
      assertStripeConfigured();
      const subscriptions = await Subscription.find({ stripeSubscriptionId: { $ne: "" } });
      for (const subscription of subscriptions) {
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
          const periodEnd = stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null;
          if (stripeSubscription.status === "active" && periodEnd && periodEnd.getTime() !== subscription.currentPeriodEnd?.getTime()) {
            await syncSubscriptionFromStripe(stripeSubscription);
          }
        } catch (error) {
          console.error(`Subscription sync failed for ${subscription.stripeSubscriptionId}:`, error.message);
        }
      }
    } catch (error) {
      console.error("Subscription renewal job failed:", error.message);
    }
  };

  check();
  setInterval(check, intervalMs);
  console.log("✅ Subscription renewal sync job started");
};