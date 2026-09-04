"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import { LANGUAGES, LanguageCode, useI18n } from "@/lib/i18n";
import { toast } from "@/components/ui/toast";

const OTP_SECONDS = 300;

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { language, setLanguage, t } = useI18n();
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [selected, setSelected] = useState<LanguageCode>(language);
  const [otp, setOtp] = useState("");
  const [destination, setDestination] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "sms" | "">("");
  const [showOtp, setShowOtp] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setSelected(language), [language]);
  useEffect(() => {
    if (!seconds) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const savePhone = async () => {
    setError("");
    setSavingPhone(true);
    try {
      const res = await axiosInstance.patch("/api/language/phone", { phoneNumber: phone });
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.add({ type: "success", title: "Mobile number saved", description: res.data.message });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to save mobile number.");
    } finally {
      setSavingPhone(false);
    }
  };

  const requestCode = async () => {
    if (selected === language) return;
    setError("");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/language/request", { language: selected });
      if (res.data.verified) {
        setLanguage(selected);
        setUser(res.data.user || { ...user, language: selected });
        return;
      }
      setDestination(res.data.destination || "");
      setDeliveryMethod(res.data.deliveryMethod || "");
      setShowOtp(true);
      setOtp("");
      setSeconds(res.data.expiresInSeconds || OTP_SECONDS);
      toast.add({ type: "success", title: "Verification code sent", description: res.data.message });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/language/verify", { otp });
      setLanguage(res.data.language);
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setShowOtp(false);
      setOtp("");
      toast.add({ type: "success", title: "Language updated", description: t("languageUpdated") });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (seconds > OTP_SECONDS - 60) return;
    setError("");
    try {
      const res = await axiosInstance.post("/api/language/resend");
      setSeconds(res.data.expiresInSeconds || OTP_SECONDS);
      setOtp("");
      toast.add({ type: "success", title: "Code resent", description: res.data.message });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to resend code.");
    }
  };

  return (
    <main className="min-h-screen bg-ig-bg text-ig-text px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-xl border border-ig-border bg-ig-surface p-6">
          <h1 className="text-2xl font-bold">{t("settings")}</h1>
          <p className="mt-1 text-sm text-ig-muted">{t("changeLanguage")}</p>
        </section>

        <section className="rounded-xl border border-ig-border bg-ig-surface p-6 space-y-5">
          <div>
            <h2 className="font-semibold">{t("language")}</h2>
            <p className="text-sm text-ig-muted mt-1">{t("currentLanguage")}: {LANGUAGES.find((item) => item.code === language)?.nativeLabel}</p>
          </div>

          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value as LanguageCode)}
            className="w-full rounded-lg border border-ig-border bg-ig-bg px-3 py-3 text-sm outline-none"
          >
            {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.nativeLabel} — {item.label}</option>)}
          </select>

          <button
            onClick={requestCode}
            disabled={loading || selected === language}
            className="rounded-lg bg-ig-blue px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Sending…" : t("changeLanguage")}
          </button>

          {selected !== language && (
            <p className="text-xs text-ig-muted">
              {selected === "fr" ? "French changes require an OTP sent to your registered email." : "This language change requires an OTP sent to your registered mobile number."}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-ig-border bg-ig-surface p-6 space-y-4">
          <div>
            <h2 className="font-semibold">{t("mobileNumber")}</h2>
            <p className="text-sm text-ig-muted mt-1">Used for secure language verification except French.</p>
          </div>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+919876543210"
            inputMode="tel"
            className="w-full rounded-lg border border-ig-border bg-ig-bg px-3 py-3 text-sm outline-none"
          />
          <button onClick={savePhone} disabled={savingPhone} className="rounded-lg border border-ig-border px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
            {savingPhone ? "Saving…" : t("saveMobile")}
          </button>
        </section>

        {showOtp && (
          <section className="rounded-xl border border-ig-border bg-ig-surface p-6 space-y-4">
            <h2 className="font-semibold">{t("verification")}</h2>
            <p className="text-sm text-ig-muted">{t("codeSent")} <strong>{destination}</strong> ({deliveryMethod}).</p>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("enterOtp")}
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-lg border border-ig-border bg-ig-bg px-3 py-3 text-center text-lg tracking-[0.4em] outline-none"
            />
            <div className="flex items-center gap-3">
              <button onClick={verifyCode} disabled={loading || otp.length !== 6 || seconds === 0} className="rounded-lg bg-ig-blue px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {loading ? "Verifying…" : t("verify")}
              </button>
              <button onClick={resend} disabled={seconds > OTP_SECONDS - 60} className="rounded-lg border border-ig-border px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                {t("resend")}
              </button>
            </div>
            <p className="text-xs text-ig-muted">{t("expires")}: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
          </section>
        )}

        {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}
      </div>
    </main>
  );
}
