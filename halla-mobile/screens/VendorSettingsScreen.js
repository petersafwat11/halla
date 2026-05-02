import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../localization/hooks/useTranslation";
import { useAuthStore } from "../stores/authStore";
import { useToast } from "../contexts/ToastContext";
import TopBar from "../components/plans/TopBar";
import VendorSettingsTabs from "../components/vendor/VendorSettingsTabs";

const VendorSettingsScreen = ({ navigation }) => {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    toast.success(t("tabs.logout") + " successfully");
  };

  const handleTabChange = (tabId) => {
    if (tabId === "about" || tabId === "privacy" || tabId === "terms") {
      toast.info("Coming soon");
      return;
    }
    if (tabId === "accountSetup") {
      navigation.navigate("VendorAccountSetup");
    } else if (tabId === "notifications") {
      toast.info("Coming soon");
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
            <VendorSettingsTabs
              activeTab={null}
              onTabChange={handleTabChange}
              onLogout={handleLogout}
            />
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

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

export default VendorSettingsScreen;
