import React from "react";
import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { settingsService } from "@/services/settings";
import AdminSettingsClient from "./_components/AdminSettingsClient";

const AdminSettingsPage = async ({ params }) => {
  const { lang } = await params;
  await requirePageAccess("settings", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let user = null;
  let notifications = null;

  if (token) {
    try {
      const userResponse = await settingsService.getProfile(token);
      user = userResponse?.data?.user || userResponse?.data || null;
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      try {
        const userCookie = cookieStore.get("user")?.value;
        if (userCookie) {
          user = JSON.parse(userCookie);
        }
      } catch (e) {
        console.error("Error parsing user cookie:", e);
      }
    }

    try {
      const notifResponse = await settingsService.getNotificationPreferences(
        token
      );
      const apiNotifications = notifResponse?.data?.preferences || null;
      if (apiNotifications) {
        notifications = {
          appNotifications: apiNotifications.appNotifications || {},
          emailNotifications: apiNotifications.emailNotifications || {},
        };
      }
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
      notifications = null;
    }
  }

  return (
    <AdminSettingsClient
      user={{
        emailVerified: user?.emailVerified || false,
        email: user?.email || "",
        username: user?.username || user?.name || "",
        name: user?.name || "",
        phoneNumber: user?.phoneNumber || "",
        profile: user?.profile || {},
      }}
      initialNotifications={notifications}
      userRole={user?.role || "admin"}
    />
  );
};

export default AdminSettingsPage;
