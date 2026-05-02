import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../localization";
import { useAuthStore } from "../stores/authStore";
import { useToast } from "../contexts/ToastContext";
import AccountSettings from "../components/settings/AccountSettings";
import { useUpdateProfile, useChangePassword } from "../hooks";
import { TopBar } from "../components/plans";

export default function AccountSettingsScreen({ navigation }) {
  const { t, currentLanguage, isRTL } = useTranslation("settings");
  const toast = useToast();
  const { token, user, setUser } = useAuthStore();

  // Mutations
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  useEffect(() => {
    console.log(
      "[AccountSettingsScreen] Mounted | Language:",
      currentLanguage,
      "| RTL:",
      isRTL,
    );
    return () => {
      console.log("[AccountSettingsScreen] Unmounted");
    };
  }, []);

  const handleProfileUpdate = async (data) => {
    try {
      const response = await updateProfileMutation.mutateAsync(data);
      if (response?.user) {
        await setUser(response.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const handlePasswordChange = async (oldPassword, newPassword) => {
    try {
      const response = await changePasswordMutation.mutateAsync({
        oldPassword,
        newPassword,
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("tabs.account")} showBack={true} />
        <AccountSettings
          onProfileUpdate={handleProfileUpdate}
          onPasswordChange={handlePasswordChange}
        />
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
});
