import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../../localization";
import { useAuthStore } from "../../../stores/authStore";
import SettingsTabs from "../../../components/settings/SettingsTabs";
import DeleteAccountSection from "../../../components/settings/DeleteAccountSection";
import TopBar from "../../../components/plans/TopBar";

export default function AdminSettingsScreen({ navigation }) {
  const { t } = useTranslation("admin");
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  const handleTabChange = (tabId) => {
    if (tabId === "account") {
      navigation.navigate("AdminAccountSettings");
    } else if (tabId === "notifications") {
      navigation.navigate("AdminNotificationSettings");
    } else if (tabId === "privacy") {
      navigation.navigate("Privacy");
    } else if (tabId === "terms") {
      navigation.navigate("Terms");
    } else if (tabId === "communityRules") {
      navigation.navigate("CommunityRules");
    } else if (tabId === "refund") {
      navigation.navigate("Refund");
    } else if (tabId === "deletion") {
      navigation.navigate("Deletion");
    } else if (tabId === "support") {
      navigation.navigate("Support");
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
            <DeleteAccountSection />
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
