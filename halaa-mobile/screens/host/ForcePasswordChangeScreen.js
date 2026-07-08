/**
 * Forced password-change screen (B4-MOBILE).
 *
 * Shown when a business account created by an admin still carries
 * `mustChangePassword:true`. The backend mirrors this with a hard 403
 * `PASSWORD_CHANGE_REQUIRED` gate on every endpoint except the identity /
 * self-service allowlist (`/auth/me`, `/auth/refresh`, `/users/password`,
 * etc.), so the client MUST land the user here before anything else works.
 *
 * This screen is rendered as the *only* route for such users by the root
 * navigator (see AppNavigator `ForcePasswordChangeStack`) — there is no other
 * tab to escape to. On success we change the password, then rotate the session
 * (`refreshTokens`) so the fresh `user` snapshot comes back with
 * `mustChangePassword:false` and the navigator falls through to the normal
 * business / host stack automatically.
 *
 * Unlike ResetPasswordScreen (token-based, public), this requires the current
 * (admin-issued) password — it routes through `useChangePassword`
 * (`PATCH /users/password`), which is on the password-change allowlist.
 */

import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useChangePassword } from "../../hooks";
import TopBar from "../../components/plans/TopBar";

const { width } = Dimensions.get("window");

export default function ForcePasswordChangeScreen() {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const refreshTokens = useAuthStore((state) => state.refreshTokens);
  const changePasswordMutation = useChangePassword();
  const loading = changePasswordMutation.isPending;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});

  const submit = useCallback(async () => {
    setErrors({});
    const fieldErrors = {};
    if (!currentPassword) {
      fieldErrors.currentPassword = t("forceChangePassword.errors.currentRequired");
    }
    if (!newPassword) {
      fieldErrors.newPassword = t("changePasswordForm.errors.newPasswordRequired");
    } else if (newPassword.length < 8) {
      fieldErrors.newPassword = t("forceChangePassword.errors.tooShort");
    }
    if (!confirmPassword) {
      fieldErrors.confirmPassword = t("changePasswordForm.errors.confirmPasswordRequired");
    } else if (newPassword !== confirmPassword) {
      fieldErrors.confirmPassword = t("changePasswordForm.errors.passwordsNotMatch");
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
        passwordConfirm: confirmPassword,
      });
      // Rotate the session so the fresh `user` snapshot clears
      // `mustChangePassword` and the navigator falls through to the
      // normal stack. `refreshTokens` persists the new shadow.
      await refreshTokens();
      toast.success(t("forceChangePassword.success"));
    } catch (error) {
      toast.error(error?.message || t("forceChangePassword.errors.failed"));
    }
  }, [
    currentPassword,
    newPassword,
    confirmPassword,
    changePasswordMutation,
    refreshTokens,
    t,
    toast,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("forceChangePassword.title")} showBack={false} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <Text style={styles.heading}>
                {t("forceChangePassword.heading")}
              </Text>
              <Text style={styles.body}>
                {t("forceChangePassword.description")}
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {t("forceChangePassword.currentPasswordLabel")}
                </Text>
                <TextInput
                  style={[styles.input, errors.currentPassword && styles.inputError]}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={t("forceChangePassword.currentPasswordPlaceholder")}
                  placeholderTextColor="#999"
                />
                {errors.currentPassword ? (
                  <Text style={styles.errorText}>{errors.currentPassword}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {t("forceChangePassword.newPasswordLabel")}
                </Text>
                <TextInput
                  style={[styles.input, errors.newPassword && styles.inputError]}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t("forceChangePassword.newPasswordPlaceholder")}
                  placeholderTextColor="#999"
                />
                {errors.newPassword ? (
                  <Text style={styles.errorText}>{errors.newPassword}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {t("forceChangePassword.confirmPasswordLabel")}
                </Text>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t("forceChangePassword.confirmPasswordPlaceholder")}
                  placeholderTextColor="#999"
                />
                {errors.confirmPassword ? (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={submit}
                disabled={loading}
                style={[styles.submit, loading && styles.submitDisabled]}
              >
                <Text style={styles.submitText}>
                  {loading
                    ? t("forceChangePassword.submitting")
                    : t("forceChangePassword.submit")}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#C28E5C" },
  container: { flex: 1, backgroundColor: "#F9F4EF" },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 80 },
  content: {
    paddingHorizontal: width > 768 ? 80 : width > 480 ? 40 : 24,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  heading: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#555",
    marginBottom: 24,
    textAlign: "center",
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    backgroundColor: "#fff",
    color: "#222",
  },
  inputError: { borderColor: "#d32f2f" },
  errorText: {
    color: "#d32f2f",
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    marginTop: 4,
  },
  submit: {
    backgroundColor: "#c28e5c",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
  },
});
