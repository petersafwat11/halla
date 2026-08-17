"use client";
import React, { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Header, ResponsiveSidebar, DASHBOARD_TYPES } from "@/ui/layout";
import useAuthStore from "@/stores/authStore";
import styles from "./layout.module.css";

function Layout({ children }) {
  const { lang } = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const promptedRef = useRef(false);
  const isRTL = lang === "ar";

  useEffect(() => {
    if (
      promptedRef.current ||
      user?.accountType !== "business" ||
      user?.mustChangePassword !== true
    ) return;

    promptedRef.current = true;
    updateUser({ mustChangePassword: false });
    Cookies.remove("mustChangePassword");

    const openSettings = window.confirm(
      lang === "ar"
        ? "نوصي بتحديث كلمة المرور لحماية حسابك. هل تريد الانتقال إلى الإعدادات الآن؟ يمكنك تخطي هذه الخطوة ومتابعة استخدام حسابك بشكل طبيعي."
        : "We recommend updating your password to protect your account. Open Settings now? You can skip this and continue using your account normally."
    );

    if (openSettings) router.push(`/${lang}/host/settings`);
  }, [lang, router, updateUser, user?.accountType, user?.mustChangePassword]);

  return (
    <div className={styles.layoutContainer} dir={isRTL ? "rtl" : "ltr"}>
      <Header dashboardType={DASHBOARD_TYPES.HOST} />
      <ResponsiveSidebar dashboardType={DASHBOARD_TYPES.HOST} />
      <div className={styles.contentWithHeader}>{children}</div>
    </div>
  );
}

export default Layout;
