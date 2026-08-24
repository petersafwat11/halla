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
 *
 * Direction contract (blueprint §5): secret values are intrinsically LTR while
 * labels and validation errors stay localized, so all three fields render
 * through the shared PasswordInput shell — no local label/input/error markup.
 */

import React, { useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, FormProvider } from "react-hook-form";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useChangePassword } from "../../hooks";
import TopBar from "../../components/plans/TopBar";
import LocalizedText from "../../components/commen/LocalizedText";
import { Button, PasswordInput } from "../../components/commen";

const { width } = Dimensions.get("window");

export default function ForcePasswordChangeScreen() {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const refreshTokens = useAuthStore((state) => state.refreshTokens);
  const changePasswordMutation = useChangePassword();
  const loading = changePasswordMutation.isPending;

  const methods = useForm({
    mode: "onSubmit",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const { handleSubmit, setError, clearErrors } = methods;

  const onSubmit = useCallback(
    async ({ currentPassword, newPassword, confirmPassword }) => {
      clearErrors();
      let invalid = false;

      if (!currentPassword) {
        setError("currentPassword", {
          type: "manual",
          message: t("forceChangePassword.errors.currentRequired"),
        });
        invalid = true;
      }
      if (!newPassword) {
        setError("newPassword", {
          type: "manual",
          message: t("changePasswordForm.errors.newPasswordRequired"),
        });
        invalid = true;
      } else if (newPassword.length < 8) {
        setError("newPassword", {
          type: "manual",
          message: t("forceChangePassword.errors.tooShort"),
        });
        invalid = true;
      }
      if (!confirmPassword) {
        setError("confirmPassword", {
          type: "manual",
          message: t("changePasswordForm.errors.confirmPasswordRequired"),
        });
        invalid = true;
      } else if (newPassword !== confirmPassword) {
        setError("confirmPassword", {
          type: "manual",
          message: t("changePasswordForm.errors.passwordsNotMatch"),
        });
        invalid = true;
      }
      if (invalid) return;

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
    },
    [changePasswordMutation, refreshTokens, toast, t, setError, clearErrors]
  );

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
              {/* Headings/body are app copy — always the UI locale. */}
              <LocalizedText role="sectionTitle" center style={styles.heading}>
                {t("forceChangePassword.heading")}
              </LocalizedText>
              <LocalizedText role="description" center style={styles.body}>
                {t("forceChangePassword.description")}
              </LocalizedText>

              <FormProvider {...methods}>
                {/* Secret values stay LTR; labels/errors stay localized. */}
                <View style={styles.fieldGroup}>
                  <PasswordInput
                    name="currentPassword"
                    label={t("forceChangePassword.currentPasswordLabel")}
                    placeholder={t(
                      "forceChangePassword.currentPasswordPlaceholder"
                    )}
                    textContentType="password"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <PasswordInput
                    name="newPassword"
                    label={t("forceChangePassword.newPasswordLabel")}
                    placeholder={t("forceChangePassword.newPasswordPlaceholder")}
                    textContentType="newPassword"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <PasswordInput
                    name="confirmPassword"
                    label={t("forceChangePassword.confirmPasswordLabel")}
                    placeholder={t(
                      "forceChangePassword.confirmPasswordPlaceholder"
                    )}
                    textContentType="newPassword"
                  />
                </View>

                <Button
                  text={
                    loading ? t("forceChangePassword.submitting") : t("forceChangePassword.submit")
                  }
                  onPress={handleSubmit(onSubmit)}
                  loading={loading}
                  disabled={loading}
                  style={styles.submit}
                />
              </FormProvider>
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
    lineHeight: 30,
    color: "#222",
    marginBottom: 8,
  },
  body: {
    color: "#555",
    marginBottom: 24,
  },
  fieldGroup: { marginBottom: 16 },
  submit: { marginTop: 8 },
});
