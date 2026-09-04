"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import { LANGUAGES, LanguageCode, useI18n } from "@/lib/i18n";
import { toast } from "@/components/ui/toast";
import { Check, ChevronLeft, Globe2, LockKeyhole, Smartphone } from "lucide-react";

const OTP_SECONDS = 300;

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { language, setLanguage, t } = useI18n();

  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [selected, setSelected] = useState<LanguageCode>(language);
  const [otp, setOtp] = useState("");
  const [destination, setDestination] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setSelected(language), [language]);

  useEffect(() => {
    if (!seconds) return;
    const timer = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [seconds]);

  const savePhone = async () => {
    setError("");
    const normalized = phone.replace(/[\s()-]/g, "");

    if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) {
      setError("Enter a valid mobile number with country code.");
      return;
    }

    setSavingPhone(true);
    try {
      const res = await axiosInstance.patch("/api/language/phone", {
        phoneNumber: normalized,
      });
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setPhone(res.data.user?.phoneNumber || normalized);
      toast.add({
        type: "success",
        title: "Mobile number saved",
        description: res.data.message,
      });
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
      const res = await axiosInstance.post("/api/language/request", {
        language: selected,
      });

      if (res.data.verified) {
        setLanguage(selected);
        setUser(res.data.user || { ...user, language: selected });
        return;
      }

      setDestination(res.data.destination || "");
      setShowOtp(true);
      setOtp("");
      setSeconds(res.data.expiresInSeconds || OTP_SECONDS);
      toast.add({
        type: "success",
        title: "Verification code sent",
        description: res.data.message,
      });
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
      toast.add({
        type: "success",
        title: "Language updated",
        description: t("languageUpdated"),
      });
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
      toast.add({
        type: "success",
        title: "Code resent",
        description: res.data.message,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to resend code.");
    }
  };

  const selectedLanguage = LANGUAGES.find((item) => item.code === selected);
  const currentLanguage = LANGUAGES.find((item) => item.code === language);
  const verificationNeedsPhone = selected !== "fr";

  return (
    <main className="min-h-screen bg-ig-bg text-ig-text md:pl-18 xl:pl-61">
      <div className="mx-auto w-full max-w-233.75 px-0 py-0 sm:px-4 sm:py-8 md:px-6">
        <div className="overflow-hidden border-x border-ig-border bg-ig-surface sm:rounded-xl sm:border">
          <header className="flex items-center gap-3 border-b border-ig-border px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded-full p-1.5 transition hover:bg-ig-hover"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 className="text-xl font-bold">{t("settings")}</h1>
              <p className="mt-0.5 text-xs text-ig-muted">Manage your language and verification settings</p>
            </div>
          </header>

          <div className="divide-y divide-ig-border">
            <section className="p-5 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ig-hover">
                  <Globe2 size={20} />
                </div>
                <div>
                  <h2 className="font-semibold">{t("language")}</h2>
                  <p className="mt-1 text-sm text-ig-muted">Choose the language you want to use across the app.</p>
                  <p className="mt-1 text-xs text-ig-muted">
                    Current language: <span className="font-medium text-ig-text">{currentLanguage?.nativeLabel}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {LANGUAGES.map((item) => {
                  const active = item.code === language;
                  const chosen = item.code === selected;

                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setSelected(item.code)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        chosen ? "border-ig-text bg-ig-hover" : "border-ig-border hover:bg-ig-hover"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.nativeLabel}</p>
                        <p className="text-xs text-ig-muted">{item.label}</p>
                      </div>
                      {active && (
                        <span className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ig-blue text-white">
                          <Check size={15} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selected !== language && (
                <div className="mt-5 rounded-xl border border-ig-border bg-ig-bg p-4">
                  <div className="flex gap-3">
                    <LockKeyhole size={18} className="mt-0.5 shrink-0 text-ig-muted" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Verification required</p>
                      <p className="mt-1 text-xs leading-5 text-ig-muted">
                        {selectedLanguage?.nativeLabel} requires a one-time verification code.
                        {verificationNeedsPhone
                          ? " The code will be sent to your registered mobile number."
                          : " The code will be sent to your registered email."}
                      </p>
                      <button
                        type="button"
                        onClick={requestCode}
                        disabled={loading}
                        className="mt-3 rounded-lg bg-ig-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading ? "Sending…" : "Send verification code"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="p-5 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ig-hover">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h2 className="font-semibold">{t("mobileNumber")}</h2>
                  <p className="mt-1 text-sm text-ig-muted">Add a mobile number for secure language verification.</p>
                </div>
              </div>

              <label htmlFor="settings-phone" className="mb-2 block text-xs font-semibold text-ig-muted">
                Mobile number
              </label>
              <input
                id="settings-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+919876543210"
                inputMode="tel"
                autoComplete="tel"
                className="w-full rounded-xl border border-ig-border bg-ig-bg px-4 py-3 text-sm outline-none transition focus:border-ig-text"
              />
              <p className="mt-2 text-xs text-ig-muted">Use an international format, for example +91 9876543210.</p>

              <button
                type="button"
                onClick={savePhone}
                disabled={savingPhone}
                className="mt-4 rounded-lg border border-ig-border px-5 py-2.5 text-sm font-semibold transition hover:bg-ig-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPhone ? "Saving…" : t("saveMobile")}
              </button>
            </section>

            {showOtp && (
              <section className="bg-ig-bg p-5 sm:p-6">
                <div className="mx-auto max-w-lg rounded-2xl border border-ig-border bg-ig-surface p-5 sm:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ig-hover">
                      <LockKeyhole size={20} />
                    </div>
                    <div>
                      <h2 className="font-semibold">{t("verification")}</h2>
                      <p className="mt-1 text-sm text-ig-muted">
                        Enter the 6-digit code sent to <strong className="text-ig-text">{destination}</strong>.
                      </p>
                    </div>
                  </div>

                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="w-full rounded-xl border border-ig-border bg-ig-bg px-4 py-4 text-center text-2xl font-semibold tracking-[0.5em] outline-none transition focus:border-ig-text"
                  />

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={verifyCode}
                      disabled={loading || otp.length !== 6 || seconds === 0}
                      className="flex-1 rounded-lg bg-ig-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Submitting…" : "Submit"}
                    </button>

                    <button
                      type="button"
                      onClick={resend}
                      disabled={seconds > OTP_SECONDS - 60}
                      className="flex-1 rounded-lg border border-ig-border px-5 py-3 text-sm font-semibold transition hover:bg-ig-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("resend")}
                    </button>
                  </div>

                  <div className="mt-4 text-center text-xs text-ig-muted">
                    {t("expires")}: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500 sm:mx-0">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
