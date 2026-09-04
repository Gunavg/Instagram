"use client";
import { Home, Search, Compass, Film, MessageCircle, Heart, PlusSquare, Menu, Bookmark, Settings, Activity, Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { currentUser, mockConversations } from "@/lib/mock-data";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useCreateModal } from "@/lib/createmodelcontext";
import { toast } from "../ui/toast";
import useAuthStore from "@/store/authStore";
import { useI18n } from "@/lib/i18n";

const Sidebar = () => {
  const totalUnread = mockConversations.reduce((s, c) => s + c.unread, 0);
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const { open: openCreate } = useCreateModal();
  const logout = useAuthStore((state) => state.logout);
  const navItems = [
    { label: t("home"), icon: Home, href: "/", badge: 0 },
    { label: t("search"), icon: Search, href: "/search", badge: 0 },
    { label: t("explore"), icon: Compass, href: "/explore", badge: 0 },
    { label: t("reels"), icon: Film, href: "/reels", badge: 0 },
    { label: t("messages"), icon: MessageCircle, href: "/messages", badge: totalUnread },
    { label: t("notifications"), icon: Heart, href: "/notifications", badge: 0 },
  ];
  const handlelogout = () => {
    logout();
    toast.add({ type: "success", title: t("logoutSuccess") });
    router.push("/login");
  };
  const isActive = (href: string) => pathname === href;
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-18 xl:w-61 bg-ig-surface border-r border-ig-border px-3 py-5 z-50 justify-between">
      <div className="flex flex-col gap-1">
        <Link href="/" className="h-18 flex items-center px-3 mb-2 rounded-lg hover:bg-ig-hover transition-colors">
          <span className="xl:hidden text-ig-text"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /></svg></span>
          <span className="hidden xl:block instagram-font text-[28px] leading-none text-ig-text">Instagram</span>
        </Link>
        {navItems.map(({ label, icon: Icon, href, badge }) => (
          <Link key={href} href={href} className={`flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-hover transition-colors ${isActive(href) ? "font-bold" : ""}`}>
            <div className="relative shrink-0"><Icon size={24} strokeWidth={isActive(href) ? 2.5 : 1.5} className="text-ig-text" />{badge > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#ed4956] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{badge}</span>}</div>
            <span className={`hidden xl:block text-[15px] text-ig-text ${isActive(href) ? "font-semibold" : "font-normal"}`}>{label}</span>
          </Link>
        ))}
        <button onClick={openCreate} className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-hover transition-colors w-full"><PlusSquare size={24} strokeWidth={1.5} className="shrink-0 text-ig-text" /><span className="hidden xl:block text-[15px] text-ig-text">{t("create")}</span></button>
        <Link href="/profile" className={`flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-hover transition-colors ${isActive("/profile") ? "font-bold" : ""}`}><div className="w-6 h-6 rounded-full overflow-hidden shrink-0"><img src={currentUser.profilePic} alt={currentUser.username} className="w-full h-full object-cover" /></div><span className="hidden xl:block text-[15px] text-ig-text">{t("profile")}</span></Link>
      </div>
      <div className="relative">
        {moreOpen && <div className="absolute bottom-14 left-0 w-62.5 bg-ig-surface rounded-2xl shadow-xl border border-ig-border overflow-hidden z-50">
          <Link href="/settings" className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ig-text hover:bg-ig-hover transition-colors"><Settings size={18} />{t("settings")}</Link>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ig-text hover:bg-ig-hover transition-colors"><Activity size={18} />{t("activity")}</button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ig-text hover:bg-ig-hover transition-colors"><Bookmark size={18} />{t("saved")}</button>
          <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ig-text hover:bg-ig-hover transition-colors">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}{theme === "light" ? t("darkMode") : t("lightMode")}</button>
          <div className="h-px bg-ig-border my-1" />
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ig-text hover:bg-ig-hover transition-colors" onClick={handlelogout}><LogOut size={18} />{t("logout")}</button>
        </div>}
        <button onClick={() => setMoreOpen(!moreOpen)} className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-hover transition-colors w-full"><Menu size={24} strokeWidth={1.5} className="text-ig-text shrink-0" /><span className="hidden xl:block text-[15px] text-ig-text">{t("more")}</span></button>
      </div>
    </aside>
  );
};
export default Sidebar;