import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization/hooks/useTranslation";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import TopBar from "../../components/plans/TopBar";
import VendorSettingsTabs from "../../components/vendor/VendorSettingsTabs";
import DeleteAccountSection from "../../components/settings/DeleteAccountSection";

const VendorSettingsScreen = ({ navigation }) => {
  const { t } = useTranslation("vendor");
  const toast = useToast();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    toast.success(t("settings.saveSuccess"));
  };

  const handleTabChange = (tabId) => {
    if (tabId === "accountSetup") {
      navigation.navigate("VendorAccountSetup");
    } else if (tabId === "privacy") {
      navigation.navigate("Privacy");
    } else if (tabId === "terms") {
      navigation.navigate("Terms");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("settings.title")} showBack={true} />
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
            <DeleteAccountSection />
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
