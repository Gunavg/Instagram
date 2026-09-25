"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import { toast } from "@/components/ui/toast";
import { Check, Crown, Medal, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const plans = [
  { key: "free", nameKey: "freePlan", price: 0, limitKey: "onePost", icon: ShieldCheck, descriptionKey: "freeDescription" },
  { key: "bronze", nameKey: "bronzePlan", price: 100, limitKey: "threePosts", icon: Medal, descriptionKey: "bronzeDescription" },
  { key: "silver", nameKey: "silverPlan", price: 300, limitKey: "fivePosts", icon: Sparkles, descriptionKey: "silverDescription" },
  { key: "gold", nameKey: "goldPlan", price: 1000, limitKey: "unlimitedPosts", icon: Crown, descriptionKey: "goldDescription" },
];

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get("/api/subscription/me");
        setSubscription(res.data.subscription);
      } catch (error: any) {
        toast.add({ type: "error", title: error?.response?.data?.message || "Unable to load subscription." });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (payment !== "success" || !sessionId) return;

    const verify = async () => {
      try {
        const res = await axiosInstance.post("/api/subscription/verify", { sessionId });
        setSubscription(res.data.subscription);
        toast.add({ type: "success", title: t("subscriptionActivated"), description: t("paymentVerified") });
        window.history.replaceState({}, "", "/subscription");
      } catch (error: any) {
        toast.add({ type: "error", title: error?.response?.data?.message || t("paymentVerificationFailed") });
      }
    };
    verify();
  }, []);

  const subscribe = async (plan: string) => {
    setCheckoutPlan(plan);
    try {
      const res = await axiosInstance.post("/api/subscription/checkout", { plan });
      window.location.href = res.data.checkoutUrl;
    } catch (error: any) {
      toast.add({
        type: "error",
        title: error?.response?.data?.message || t("unableStartPayment"),
        description: error?.response?.data?.code === "PAYMENT_WINDOW_CLOSED" ? t("paymentHours") : undefined,
      });
    } finally {
      setCheckoutPlan("");
    }
  };

  const cancel = async () => {
    try {
      const res = await axiosInstance.post("/api/subscription/cancel");
      setSubscription(res.data.subscription);
      toast.add({ type: "success", title: t("cancellationScheduled"), description: t("planRemainsActive") });
    } catch (error: any) {
      toast.add({ type: "error", title: error?.response?.data?.message || t("unableCancelSubscription") });
    }
  };

  return (
    <main className="min-h-screen bg-ig-bg text-ig-text md:pl-18 xl:pl-61">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ig-muted">{t("membership")}</p>
          <h1 className="mt-2 text-3xl font-bold">{t("chooseSubscription")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ig-muted">{t("postLimit")}</p>
        </div>

        {subscription && (
          <div className="mb-8 rounded-2xl border border-ig-border bg-ig-surface p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ig-muted">{t("currentPlan")}</p>
                <p className="mt-1 text-xl font-bold capitalize">{t("planNames."+subscription.plan)} <span className="text-sm font-medium text-ig-muted">· {t("status."+subscription.status)}</span></p>
                {subscription.currentPeriodEnd && <p className="mt-1 text-xs text-ig-muted">Valid through {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN")}</p>}
                {subscription.cancelAtPeriodEnd && <p className="mt-1 text-xs font-semibold text-orange-600">{t("cancellationScheduled")}</p>}
              </div>
              {subscription.plan !== "free" && !subscription.cancelAtPeriodEnd && (
                <button onClick={cancel} className="rounded-lg border border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10">{t("cancelSubscription")}</button>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const active = subscription?.plan === plan.key;
            return (
              <div key={plan.key} className={`rounded-2xl border bg-ig-surface p-5 shadow-sm ${active ? "border-ig-text" : "border-ig-border"}`}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ig-hover"><Icon size={22} /></div>
                <div className="mt-5 flex items-end justify-between gap-2">
                  <h2 className="text-lg font-bold">{t(plan.nameKey)}</h2>
                  {active && <span className="rounded-full bg-ig-text px-2.5 py-1 text-[10px] font-bold text-ig-surface">{t("current")}</span>}
                </div>
                <p className="mt-1 text-sm text-ig-muted">{t(plan.descriptionKey)}</p>
                <div className="mt-5">
                  <span className="text-3xl font-bold">₹{plan.price}</span>
                  {plan.price > 0 && <span className="text-sm text-ig-muted"> / {t("month")}</span>}
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-semibold"><Check size={17} /> {t(plan.limitKey)}</div>
                {plan.key !== "free" && !active ? (
                  <button onClick={() => subscribe(plan.key)} disabled={checkoutPlan === plan.key || loading} className="mt-6 w-full rounded-xl bg-[#0095f6] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">{checkoutPlan === plan.key ? t("openingPayment") : `${t("choose")} ${t(plan.nameKey).replace(" " + t("planWord"), "")}`}</button>
                ) : (
                  <div className="mt-6 rounded-xl border border-ig-border px-4 py-3 text-center text-sm font-semibold text-ig-muted">{active ? t("planCurrent") : t("includedDefault")}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-ig-border bg-ig-surface p-5 text-sm text-ig-muted">
          <p className="font-semibold text-ig-text">{t("paymentAvailability")}</p>
          <p className="mt-1">{t("paymentAvailabilityText")}</p>
        </div>
      </div>
    </main>
  );
}