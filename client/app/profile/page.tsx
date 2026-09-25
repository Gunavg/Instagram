"use client";

import ProfileView from "@/components/insta/ProfileView";
import axiosInstance from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const Page = () => {
  const [user, setUser] = useState<any>(null);
  const curuser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const fetchUser = async () => {
      if (!curuser?.username) {
        setUser(null);
        return;
      }

      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/auth/${curuser.username}`);
        setUser(res.data);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [curuser?.username]);

  if (loading) {
    return <div className="flex justify-center py-10">{t("loadingProfile")}</div>;
  }

  if (!curuser) {
    return <div className="flex justify-center py-10">{t("userNotFound")}</div>;
  }

  if (!user) {
    return <div className="flex justify-center py-10">{t("userNotFound")}</div>;
  }

  return <ProfileView user={user} isOwnProfile />;
};

export default Page;
