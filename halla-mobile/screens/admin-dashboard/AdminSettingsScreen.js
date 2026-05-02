import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import SettingsTabs from "../../components/settings/SettingsTabs";
import TopBar from "../../components/plans/TopBar";

export default function AdminSettingsScreen({ navigation }) {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  const handleTabChange = (tabId) => {
    if (tabId === "about" || tabId === "privacy" || tabId === "terms") {
      toast.info("Coming soon");
      return;
    }
    if (tabId === "account") {
      navigation.navigate("AdminAccountSettings");
    } else if (tabId === "notifications") {
      navigation.navigate("AdminNotificationSettings");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("settings.title")} showBack />
        <View style={styles.content}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <SettingsTabs
              activeTab={null}
              onTabChange={handleTabChange}
              onLogout={handleLogout}
            />
          </ScrollView>
        </View>
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
    backgroundColor: "#F9F4EF",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
