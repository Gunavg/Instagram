"use client";

import { useEffect, useState } from "react";
import { Clock3, Monitor, Smartphone, CheckCircle2, XCircle } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { useI18n } from "@/lib/i18n";

type LoginHistoryItem = {
  _id: string;
  browser: string;
  operatingSystem: string;
  deviceType: "Desktop" | "Laptop" | "Mobile";
  ipAddress: string;
  loginAt: string;
  status: "success" | "failed";
  failureReason?: string;
  verificationMethod?: "none" | "email_otp";
};

export default function LoginHistory() {
  const { t } = useI18n();
  const [items, setItems] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axiosInstance.get("/api/auth/login-history?limit=30");
        setItems(response.data.history || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || t("unableLoadLoginHistory"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <section className="mt-8 border-t border-ig-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock3 size={18} />
        <h2 className="text-base font-semibold text-ig-text">{t("loginHistory")}</h2>
      </div>
      <p className="text-xs text-ig-muted mb-4">{t("reviewLoginHistory")}</p>
      {loading && <p className="text-sm text-ig-muted">{t("loadingLoginHistory")}</p>}
      {!loading && error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="text-sm text-ig-muted">{t("noLoginHistory")}</p>}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item._id} className="rounded-xl border border-ig-border bg-ig-bg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {item.deviceType === "Mobile" ? <Smartphone size={18} /> : <Monitor size={18} />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ig-text">{item.browser} · {item.deviceType}</p>
                    <p className="text-xs text-ig-muted">{item.operatingSystem} · {item.ipAddress}</p>
                  </div>
                </div>
                {item.status === "success" ? <CheckCircle2 size={18} className="text-green-500" /> : <XCircle size={18} className="text-red-500" />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ig-muted">
                <span>{new Date(item.loginAt).toLocaleString()}</span>
                <span>·</span><span className={item.status === "success" ? "text-green-500" : "text-red-500"}>{t(item.status)}</span>
                {item.verificationMethod === "email_otp" && <><span>·</span><span>{t("emailOtp")}</span></>}
              </div>
              {item.failureReason && <p className="mt-2 text-xs text-red-500">{item.failureReason}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}