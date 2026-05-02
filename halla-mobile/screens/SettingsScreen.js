import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../localization";
import { useAuthStore } from "../stores/authStore";
import { useToast } from "../contexts/ToastContext";
import SettingsTabs from "../components/settings/SettingsTabs";
import { TopBar } from "../components/plans";

export default function SettingsScreen({ navigation }) {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    toast.success(t("tabs.logout") + " " + "successfully");
  };

  const handleTabChange = (tabId) => {
    if (tabId === "about" || tabId === "privacy" || tabId === "terms") {
      // TODO: Navigate to static pages
      toast.info("Coming soon");
      return;
    }

    // Navigate to the specific settings screen
    if (tabId === "account") {
      navigation.navigate("AccountSettings");
    } else if (tabId === "notifications") {
      navigation.navigate("NotificationSettings");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("title")} showBack={true} />
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
