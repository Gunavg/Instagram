"use client";

import { toast } from "@/components/ui/toast";
import useAuthStore from "@/store/authStore";
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeUser, setChallengeUser] = useState<any>(null);
  const [destination, setDestination] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    if (!seconds) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const finishLogin = (data: any) => {
    login({ user: data.user, token: data.accessToken });
    toast.add({ type: "success", title: "Login Successful", description: `Hello ${data.user.username}` });
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/api/auth/login", { email, password });
      if (res.data.success && res.data.requiresOtp) {
        setChallengeUser(res.data.user);
        setDestination(res.data.destination || "your registered email");
        setSeconds(Number(res.data.expiresInSeconds || 300));
        return;
      }
      if (res.data.success) finishLogin(res.data);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Login failed.";
      setError(message);
      toast.add({ type: "error", description: message, priority: "high" });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6 || !challengeUser?._id) return;
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/api/auth/login/verify", { userId: challengeUser._id, otp });
      if (res.data.success) finishLogin(res.data);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Verification failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!challengeUser?._id) return;
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/api/auth/login/resend", { userId: challengeUser._id });
      if (res.data.success) {
        setSeconds(Number(res.data.expiresInSeconds || 300));
        toast.add({ type: "success", title: "Code resent", description: "A new code has been sent to your email." });
      }
    } catch (error: any) {
      setError(error?.response?.data?.message || "Unable to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ig-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-87.5">
        {challengeUser ? (
          <div className="bg-ig-surface border border-ig-border rounded-2xl px-7 py-8">
            <button type="button" onClick={() => { setChallengeUser(null); setOtp(""); setError(""); }} className="flex items-center gap-2 text-sm text-ig-muted hover:text-ig-text">
              <ArrowLeft size={16} /> Back to login
            </button>
            <div className="mt-6 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-ig-hover flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
            </div>
            <h1 className="mt-4 text-center text-xl font-semibold text-ig-text">Chrome Login Verification</h1>
            <p className="mt-2 text-center text-sm text-ig-muted">Enter the 6-digit code sent to <strong>{destination}</strong>.</p>
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="000000" autoComplete="one-time-code" className="mt-6 w-full rounded-xl border border-ig-border bg-ig-bg px-4 py-4 text-center text-2xl font-semibold tracking-[0.5em] text-ig-text outline-none" />
            {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}
            <button type="button" onClick={verifyOtp} disabled={loading || otp.length !== 6 || seconds === 0} className="mt-4 w-full rounded-xl bg-[#0095f6] px-4 py-3 font-semibold text-white disabled:opacity-50">
              {loading ? "Verifying…" : "Verify & Log in"}
            </button>
            <button type="button" onClick={resendOtp} disabled={loading || seconds > 240} className="mt-3 w-full rounded-xl border border-ig-border px-4 py-3 font-semibold text-ig-text disabled:opacity-50">
              Resend code
            </button>
            <p className="mt-3 text-center text-xs text-ig-muted">Code expires in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
          </div>
        ) : (
          <div className="bg-ig-surface border border-ig-border rounded-sm px-10 pt-10 pb-6">
            <h1 className="instagram-font text-[38px] text-center text-ig-text mb-8 leading-none">Instagram</h1>
            {error && <p className="text-xs text-[#ed4956] text-center mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
              <input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-ig-bg border border-ig-border rounded-[3px] text-[12px] px-2 py-2.25 outline-none text-ig-text" />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-ig-bg border border-ig-border rounded-[3px] text-[12px] px-2 py-2.25 pr-16 outline-none text-ig-text" />
                {password && <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ig-text">{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
              </div>
              <button type="submit" disabled={!email || !password || loading} className="w-full bg-[#0095f6] text-white text-sm font-semibold rounded-lg py-1.75 mt-2 disabled:opacity-50">
                {loading ? "Logging in…" : "Log in"}
              </button>
            </form>
            <div className="flex items-center gap-4 my-4"><div className="flex-1 h-px bg-ig-border" /><span className="text-[13px] font-semibold text-ig-muted">OR</span><div className="flex-1 h-px bg-ig-border" /></div>
            <button className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-ig-blue">Log in with Facebook</button>
            <a href="#" className="block text-center text-xs text-ig-blue mt-4">Forgot password?</a>
          </div>
        )}
        {!challengeUser && (
          <div className="mt-3 bg-ig-surface border border-ig-border rounded-sm py-4 text-center text-sm text-ig-text">
            Don&apos;t have an account? <Link href="/signup" className="text-[#0095f6] font-semibold">Sign up</Link>
          </div>
        )}
      </div>
    </div>
  );
}