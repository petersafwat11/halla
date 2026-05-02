import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useNotificationSettings, useUpdateNotificationSettings } from "../../hooks";
import TopBar from "../../components/plans/TopBar";
import AdminNotificationSettings from "../../components/admin-dashboard/settings/AdminNotificationSettings";

export default function AdminNotificationSettingsScreen({ navigation }) {
  const { t } = useTranslation("settings");
  const toast = useToast();

  const { data: notificationPreferences, isLoading: loading, error } =
    useNotificationSettings();
  const updateSettingsMutation = useUpdateNotificationSettings();

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load preferences");
    }
  }, [error]);

  const handleNotificationUpdate = async (data) => {
    const response = await updateSettingsMutation.mutateAsync(data);
    return response;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("tabs.notifications")} showBack />
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c28e5c" />
          </View>
        ) : (
          <AdminNotificationSettings
            initialData={notificationPreferences}
            onUpdate={handleNotificationUpdate}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#C28E5C",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
