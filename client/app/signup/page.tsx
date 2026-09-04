"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import axiosInstance from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import { toast } from "@/components/ui/toast";

interface FormData {
  email: string;
  phoneNumber: string;
  fullName: string;
  username: string;
  password: string;
  profilePicture?: string;
}

interface FormErrors {
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  username?: string;
  password?: string;
}

const PAGE = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    phoneNumber: "",
    fullName: "",
    username: "",
    password: "",
    profilePicture:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const login = useAuthStore((state) => state.login);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Enter your mobile number.";
    } else if (!/^\+?[1-9]\d{7,14}$/.test(formData.phoneNumber.replace(/[\s()-]/g, ""))) {
      newErrors.phoneNumber = "Enter a valid mobile number with country code.";
    }
    if (!formData.fullName) newErrors.fullName = "Enter your full name.";
    if (!formData.username || formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters.";
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/auth/register", formData);
      if (res.data.success) {
        login({ user: res.data.user, token: res.data.accessToken });
        toast.add({
          type: "success",
          title: "Signup Successful",
          description: `Welcome ${res.data.user.username}`,
        });
        router.push("/");
      }
    } catch (error: any) {
      toast.add({
        type: "error",
        title: "Signup Failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Something went wrong",
        priority: "high",
      });
    } finally {
      setLoading(false);
    }
  };

  const allFilled =
    formData.email &&
    formData.phoneNumber &&
    formData.fullName &&
    formData.username &&
    formData.password;

  return (
    <div className="min-h-screen bg-ig-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-87.5 flex flex-col gap-3">
        <div className="bg-ig-surface border border-ig-border rounded-sm px-10 pt-10 pb-6">
          <h1 className="instagram-font text-[38px] text-center text-ig-text mb-4 leading-none">
            Instagram
          </h1>

          <p className="text-base font-semibold text-ig-muted text-center leading-tight mb-5">
            Sign up to see photos and videos from your friends.
          </p>

          <button className="w-full flex items-center justify-center gap-2 bg-[#0095f6] text-white text-sm font-semibold rounded-lg py-1.75 mb-4 hover:bg-[#1877f2] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Log in with Facebook
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-ig-border" />
            <span className="text-[13px] font-semibold text-ig-muted tracking-widest">OR</span>
            <div className="flex-1 h-px bg-ig-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                className={`w-full bg-ig-bg border rounded-[3px] text-[12px] px-2 py-2.25 focus:outline-none placeholder:text-ig-muted transition-colors text-ig-text ${errors.email ? "border-[#ed4956]" : "border-ig-border focus:border-ig-muted"}`}
              />
              {errors.email && <p className="text-[11px] text-[#ed4956] mt-1">{errors.email}</p>}
            </div>

            <div>
              <input
                type="tel"
                name="phoneNumber"
                placeholder="Mobile number (with country code)"
                value={formData.phoneNumber}
                onChange={handleChange}
                autoComplete="tel"
                inputMode="tel"
                className={`w-full bg-ig-bg border rounded-[3px] text-[12px] px-2 py-2.25 focus:outline-none placeholder:text-ig-muted transition-colors text-ig-text ${errors.phoneNumber ? "border-[#ed4956]" : "border-ig-border focus:border-ig-muted"}`}
              />
              {errors.phoneNumber ? (
                <p className="text-[11px] text-[#ed4956] mt-1">{errors.phoneNumber}</p>
              ) : (
                <p className="text-[10px] text-ig-muted mt-1">Example: +919876543210</p>
              )}
            </div>

            <div>
              <input
                type="text"
                name="fullName"
                placeholder="Full name"
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
                className={`w-full bg-ig-bg border rounded-[3px] text-[12px] px-2 py-2.25 focus:outline-none placeholder:text-ig-muted transition-colors text-ig-text ${errors.fullName ? "border-[#ed4956]" : "border-ig-border focus:border-ig-muted"}`}
              />
              {errors.fullName && <p className="text-[11px] text-[#ed4956] mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                minLength={3}
                maxLength={30}
                autoComplete="username"
                className={`w-full bg-ig-bg border rounded-[3px] text-[12px] px-2 py-2.25 focus:outline-none placeholder:text-ig-muted transition-colors text-ig-text ${errors.username ? "border-[#ed4956]" : "border-ig-border focus:border-ig-muted"}`}
              />
              {errors.username && <p className="text-[11px] text-[#ed4956] mt-1">{errors.username}</p>}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  autoComplete="new-password"
                  className={`w-full bg-ig-bg border rounded-[3px] text-[12px] px-2 py-2.25 pr-16 focus:outline-none placeholder:text-ig-muted transition-colors text-ig-text ${errors.password ? "border-[#ed4956]" : "border-ig-border focus:border-ig-muted"}`}
                />
                {formData.password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ig-text"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
              {errors.password && <p className="text-[11px] text-[#ed4956] mt-1">{errors.password}</p>}
            </div>

            <p className="text-[11px] text-ig-muted text-center leading-tight mt-2">
              People who use our service may have uploaded your contact information to Instagram. <a href="#" className="text-ig-blue hover:underline">Learn more</a>
            </p>
            <p className="text-[11px] text-ig-muted text-center leading-tight">
              By signing up, you agree to our <a href="#" className="text-ig-blue hover:underline">Terms</a>, <a href="#" className="text-ig-blue hover:underline">Privacy Policy</a> and <a href="#" className="text-ig-blue hover:underline">Cookies Policy</a>.
            </p>

            <button
              type="submit"
              disabled={!allFilled || loading}
              className="w-full bg-[#0095f6] text-white text-sm font-semibold rounded-lg py-1.75 mt-2 disabled:opacity-50 hover:bg-[#1877f2] transition-colors active:scale-[0.98]"
            >
              {loading ? "Signing up…" : "Sign up"}
            </button>
          </form>
        </div>

        <div className="bg-ig-surface border border-ig-border rounded-sm py-4 text-center">
          <p className="text-sm text-ig-text">
            Have an account? <Link href="/login" className="text-[#0095f6] font-semibold hover:text-[#1877f2] dark:text-[#38b6ff] dark:hover:text-[#5cc8ff]">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PAGE;