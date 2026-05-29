import React from "react";
import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import { usersKeys } from "@/hooks/users/keys";
import AdminSettingsClient from "./_components/AdminSettingsClient";

const AdminSettingsPage = async ({ params }) => {
  const { lang } = await params;
  await requirePageAccess("settings", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await Promise.all([
      prefetchServerData({
        queryClient,
        queryKey: usersKeys.myProfile(),
        path: API_PATHS.users.getMyProfile,
        token,
      }),
      prefetchServerData({
        queryClient,
        queryKey: usersKeys.notificationPreferences(),
        path: API_PATHS.users.getNotificationPreferences,
        token,
      }),
    ]);
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <AdminSettingsClient />
    </QueryClientServerProvider>
  );
};

export default AdminSettingsPage;
