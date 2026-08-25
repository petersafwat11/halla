import React, { useCallback, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../stores/authStore";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  useProfile,
} from "../../../hooks";
import { colors, backgrounds } from "../../../styles/tokens";
import TopBar from "../../../components/plans/TopBar";
import AdminNotificationSettings from "../../../components/admin-dashboard/settings/AdminNotificationSettings";

export default function AdminNotificationSettingsScreen({ navigation }) {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const authUser = useAuthStore((state) => state.user);

  const { data: notificationPreferences, isLoading: loading, error } =
    useNotificationSettings();
  const updateSettingsMutation = useUpdateNotificationSettings();

  // Canonical profile drives the email-verification gate (web parity);
  // fall back to the persisted auth snapshot while it loads / on failure.
  const { data: profileResponse } = useProfile();
  const profileUser = profileResponse?.data?.user;
  const emailVerified = !!(
    profileUser?.emailVerified ?? authUser?.emailVerified
  );

  useEffect(() => {
    if (error) {
      toast.error(error.message || t("notifications.updateError"));
    }
  }, [error, toast, t]);

  const handleNotificationUpdate = useCallback(async (data) => {
    const response = await updateSettingsMutation.mutateAsync(data);
    return response;
  }, [updateSettingsMutation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("tabs.notifications")} showBack />
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : (
          <AdminNotificationSettings
            initialData={notificationPreferences}
            onUpdate={handleNotificationUpdate}
            emailVerified={emailVerified}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: backgrounds.card[8],
  },
  container: {
    flex: 1,
    backgroundColor: backgrounds.artboard,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
