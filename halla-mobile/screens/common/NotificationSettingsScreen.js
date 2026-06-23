import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import NotificationSettings from "../../components/settings/NotificationSettings";
import { useNotificationSettings, useUpdateNotificationSettings } from "../../hooks";
import { TopBar } from "../../components/plans";

export default function NotificationSettingsScreen({ navigation }) {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const { token } = useAuthStore();

  const { data: notificationPreferences, isLoading: loading, error } = useNotificationSettings();

  const updateSettingsMutation = useUpdateNotificationSettings();

  React.useEffect(() => {
    if (error) {
      toast.error(t("notifications.loadError", "Failed to load preferences"));
    }
  }, [error, toast, t]);

  const handleNotificationUpdate = async (data) => {
    const response = await updateSettingsMutation.mutateAsync(data);
    return response;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("tabs.notifications")} showBack={true} />
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c28e5c" />
          </View>
        ) : (
          <NotificationSettings
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
