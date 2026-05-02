"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import Tabs from "@/ui/commen/tabs/Tabs";
import AccountSettings from "@/app/[lang]/host/settings/_components/AccountSettings";
import NotificationPreferences from "@/ui/settings/notificationsPrefrences/NotificationPreferences";
import { USER_ROLES } from "@/utils/schemas/notificationPreferencesSchemas";
import styles from "../page.module.css";

const AdminSettingsClient = ({
  user,
  initialNotifications,
  userRole = USER_ROLES.ADMIN,
}) => {
  const { t: tSettings, i18n } = useTranslation("settings");
  const router = useRouter();
  const { lang } = useParams();
  const isArabic = i18n.language === "ar";
  const [activeTab, setActiveTab] = useState("account");

  const tabs = [
    { key: "account", label: tSettings("tabs.account") || "Account Settings" },
    {
      key: "notifications",
      label: tSettings("tabs.notifications") || "Notifications",
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountSettings user={user} isAdmin={true} />;
      case "notifications":
        return (
          <NotificationPreferences
            initialData={initialNotifications}
            userRole={userRole}
            emailVerified={user?.emailVerified || false}
          />
        );
      default:
        return <AccountSettings user={user} isAdmin={true} />;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <IoIosArrowForward
            onClick={() => router.push(`/${lang}/admin-dash`)}
            style={{
              transform: isArabic ? "rotate(0deg)" : "rotate(180deg)",
              cursor: "pointer",
              fontSize: "2.4rem",
            }}
          />
          {tSettings("title") || "Settings"}
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

          <div className={styles.tabContent}>{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsClient;
