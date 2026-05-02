"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import Tabs from "@/ui/commen/tabs/Tabs";
import AccountSettings from "./_components/AccountSettings";
import NotificationPreferences from "@/ui/settings/notificationsPrefrences/NotificationPreferences";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useMyProfile, useNotificationPreferences } from "@/hooks/reactQueryHooks/useUsers";
import { USER_ROLES } from "@/utils/schemas/notificationPreferencesSchemas";
import styles from "./page.module.css";

const HostSettingsPage = () => {
  const { t, i18n } = useTranslation("settings");
  const router = useRouter();
  const { lang } = useParams();
  const isArabic = i18n.language === "ar";
  const [activeTab, setActiveTab] = useState("account");

  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const { data: notificationPrefsData, isLoading: notifLoading } = useNotificationPreferences();

  const user = profileData?.data?.user;

  const tabs = [
    { key: "account", label: t("tabs.account") || "إعدادات الحساب" },
    { key: "notifications", label: t("tabs.notifications") || "الإشعارات" },
  ];

  if (profileLoading || (activeTab === "notifications" && notifLoading)) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("title") || "الإعدادات"}</h1>
        </div>
        <SimpleLoading />
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackMessage={t("errors.boundary", "Failed to load settings")}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <IoIosArrowForward
              onClick={() => router.push(`/${lang}/host`)}
              style={{
                transform: isArabic ? "rotate(0deg)" : "rotate(180deg)",
                cursor: "pointer",
                fontSize: "2.4rem",
              }}
            />
            {t("title") || "الإعدادات"}
          </h1>
        </div>

        <div className={styles.content}>
          <div className={styles.card}>
            <div className={styles.tabsContainer}>
              <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <div className={styles.tabContent}>
              {activeTab === "account" && (
                <AccountSettings
                  user={{
                    emailVerified: user?.emailVerified || false,
                    email: user?.email || "",
                    username: user?.username || user?.name || "",
                    name: user?.name || "",
                    phoneNumber: user?.phoneNumber || "",
                  }}
                />
              )}
              {activeTab === "notifications" && (
                <NotificationPreferences
                  initialData={notificationPrefsData?.data?.preferences}
                  userRole={USER_ROLES.HOST}
                  emailVerified={user?.emailVerified || false}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default HostSettingsPage;
