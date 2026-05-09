"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import Tabs from "@/ui/commen/tabs/Tabs";
import AccountSettings from "@/app/[lang]/host/settings/_components/AccountSettings";
import NotificationPreferences from "@/ui/settings/notificationsPrefrences/NotificationPreferences";
import ErrorFallback from "@/ui/common/error/ErrorFallback";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useMyProfile, useNotificationPreferences } from "@/hooks/reactQueryHooks/useUsers";
import { USER_ROLES } from "@/utils/schemas/notificationPreferencesSchemas";
import styles from "../page.module.css";

const AdminSettingsClient = () => {
  const { t: tSettings, i18n } = useTranslation("settings");
  const router = useRouter();
  const { lang } = useParams();
  const isArabic = i18n.language === "ar";
  const [activeTab, setActiveTab] = useState("account");

  const { data: profileData, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useMyProfile();
  const { data: notificationPrefsData, isLoading: notifLoading } = useNotificationPreferences();

  const apiUser = profileData?.data?.user;
  const user = {
    emailVerified: apiUser?.emailVerified || false,
    email: apiUser?.email || "",
    username: apiUser?.username || apiUser?.name || "",
    name: apiUser?.name || "",
    phoneNumber: apiUser?.phoneNumber || "",
    profile: apiUser?.profile || {},
  };
  const userRole = apiUser?.role || USER_ROLES.ADMIN;

  const tabs = [
    { key: "account", label: tSettings("tabs.account", "Account Settings") },
    { key: "notifications", label: tSettings("tabs.notifications", "Notifications") },
  ];

  if (profileLoading || (activeTab === "notifications" && notifLoading)) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{tSettings("title", "Settings")}</h1>
        </div>
        <SimpleLoading />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{tSettings("title", "Settings")}</h1>
        </div>
        <ErrorFallback
          message={tSettings("errors.loadFailed", "Failed to load settings")}
          onRetry={refetchProfile}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <IoIosArrowForward
            onClick={() => router.push(`/${lang}/admin-dash`)}
            className={`${styles.backIcon} ${isArabic ? styles.backIconRtl : ""}`}
          />
          {tSettings("title", "Settings")}
        </h1>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.tabsContainer}>
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          <div className={styles.tabContent}>
            {activeTab === "account" && (
              <AccountSettings user={user} />
            )}
            {activeTab === "notifications" && (
              <NotificationPreferences
                initialData={notificationPrefsData?.data?.preferences}
                userRole={userRole}
                emailVerified={user.emailVerified}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsClient;
