import React, { useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { authErrorMessage } from "../../services/authErrors";
import CompleteProfileForm from "../../components/auth/CompleteProfileForm";
import TopBar from "../../components/plans/TopBar";
import { colors } from "../../styles/tokens";

export default function CompleteProfileScreen() {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const completeProfile = useAuthStore((state) => state.completeProfile);
  const logout = useAuthStore((state) => state.logout);
  const status = useAuthStore((state) => state.status);
  const loading = status === "loading";

  const resolveError = (result, fallbackKey) => {
    const resolved = authErrorMessage(result?.errorDetail, t);
    return resolved?.message || result?.error || t(fallbackKey);
  };

  const fieldKeyFor = (apiField) => {
    if (apiField === "email") return "email";
    if (apiField === "phoneNumber" || apiField === "phone") return "mobile";
    if (apiField === "username" || apiField === "fullName") return "fullName";
    return null;
  };

  const handleSubmit = useCallback(
    async (data) => {
      const result = await completeProfile(data);
      if (result.success) {
        toast.success(t("signup.completeProfileTitle") + " " + t("common.success", { defaultValue: "Success" }));
      } else {
        const msg = resolveError(result, "errors.signupFailed");
        toast.error(msg);
        const target = fieldKeyFor(result?.errorDetail?.field) || "email";
        return { success: false, fieldErrors: { [target]: msg } };
      }
      return result;
    },
    [completeProfile, t, toast]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TopBar
        title={t("signup.completeProfileTitle")}
        showBack={false}
        rightContent={
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
            activeOpacity={0.7}
            accessibilityLabel={t("logout", { defaultValue: "Log out" })}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.secondary[700]} />
            <Text style={styles.logoutText}>
              {t("logout", { defaultValue: "خروج" })}
            </Text>
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <CompleteProfileForm onSubmit={handleSubmit} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  formCard: {
    width: "100%",
    maxWidth: 440,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: colors.secondary[700],
  },
});
