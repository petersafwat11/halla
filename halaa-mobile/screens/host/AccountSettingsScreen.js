import React from "react";
import { View, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import AccountSettings from "../../components/settings/AccountSettings";
import BusinessSettings from "../../components/settings/BusinessSettings";
import { useProfile, useUpdateProfile, useChangePassword } from "../../hooks";
import { TopBar } from "../../components/plans";

export default function AccountSettingsScreen() {
  const { t } = useTranslation("settings");
  const { setUser } = useAuthStore();

  const { data: profileResponse, isLoading: profileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const profileUser = profileResponse?.data?.user;

  const handleProfileUpdate = async (data) => {
    const response = await updateProfileMutation.mutateAsync(data);
    if (response?.user) {
      await setUser(response.user);
    }
    return response;
  };

  const handlePasswordChange = async ({ currentPassword, newPassword, confirmPassword }) =>
    changePasswordMutation.mutateAsync({
      currentPassword,
      newPassword,
      passwordConfirm: confirmPassword,
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("tabs.account")} showBack={true} />
        {profileLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c28e5c" />
          </View>
        ) : (
          <AccountSettings
            initialUser={profileUser}
            onProfileUpdate={handleProfileUpdate}
            onPasswordChange={handlePasswordChange}
          >
            {profileUser?.accountType === "business" && (
              <BusinessSettings
                user={profileUser}
                onProfileUpdate={handleProfileUpdate}
              />
            )}
          </AccountSettings>
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
