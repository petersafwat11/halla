/**
 * Reset-password completion screen.
 *
 * Lands here from the canonical reset deep link (§5.1):
 *   - `https://halaa.com.sa/<lang>/change-password?token=<token>` (universal/app link)
 *   - `halaa://change-password?token=<token>`                     (custom scheme)
 *
 * The token is read from `route.params.token` (React Navigation parses the
 * `?token=` query string into params). On success the backend
 * issues a fresh token pair and the auth store transitions to
 * `authenticated`, so the navigator's root-state effect lands the user
 * on the correct home tab automatically.
 *
 * Deep-link wiring: see `linking` config in `App.js` /
 * `navigation/linking.js`. The Expo `app.json` should declare
 * `scheme: "halla"` and `intentFilters` / `associatedDomains` for the
 * universal-link variant.
 *
 * Direction contract (blueprint §5): the secret values are intrinsically LTR
 * while labels, helper text and validation errors stay localized, so this
 * screen renders its fields exclusively through the shared PasswordInput
 * shell instead of local label/input/error triplets.
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { resetPasswordSchema } from "@halaa/shared/schemas/auth";
import { authErrorMessage } from "../../services/authErrors";
import TopBar from "../../components/plans/TopBar";
import LocalizedText from "../../components/commen/LocalizedText";
import { Button, PasswordInput } from "../../components/commen";

const { width } = Dimensions.get("window");

export default function ResetPasswordScreen({ route, navigation }) {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const { resetPassword, status } = useAuthStore();
  const loading = status === "loading";

  const token = route?.params?.token;

  const methods = useForm({
    resolver: zodResolver(resetPasswordSchema(t)),
    mode: "onBlur",
    defaultValues: {
      password: "",
      passwordConfirm: "",
    },
  });
  const { handleSubmit, setError } = methods;

  const submit = useCallback(
    async ({ password, passwordConfirm }) => {
      if (!token) {
        toast.error(t("changePassword.tokenMissing"));
        return null;
      }

      const result = await resetPassword({ token, password, passwordConfirm });
      if (result.success) {
        toast.success(t("changePassword.success"));
        // Auth store transitions to authenticated — root navigator handles routing.
        return result;
      }
      return result;
    },
    [token, resetPassword, t, toast]
  );

  // Schema errors render inline through the shared field shell; backend
  // failures are surfaced as a server error on the matching field.
  const onSubmit = useCallback(
    async (data) => {
      const result = await submit(data);
      if (!result || result.success !== false) return;
      const msg =
        authErrorMessage(result.errorDetail, t)?.message ||
        result.error ||
        t("errors.resetFailed");
      if (result.errorDetail?.field === "password") {
        setError("password", { type: "server", message: msg });
      } else {
        setError("passwordConfirm", { type: "server", message: msg });
      }
    },
    [submit, t, setError]
  );

  const back = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("Login");
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar
          title={t("changePassword.title")}
          showBack={true}
          onBack={back}
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
            <View style={styles.content}>
              {/* Headings/body are app copy — always the UI locale. */}
              <LocalizedText role="sectionTitle" center style={styles.heading}>
                {t("changePassword.heading")}
              </LocalizedText>
              <LocalizedText role="description" center style={styles.body}>
                {t("changePassword.description")}
              </LocalizedText>

              <FormProvider {...methods}>
                <View style={styles.fieldGroup}>
                  {/* Secret value stays LTR; chrome stays localized. */}
                  <PasswordInput
                    name="password"
                    label={t("changePassword.newPasswordLabel")}
                    placeholder={t("changePassword.newPasswordPlaceholder")}
                    textContentType="newPassword"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <PasswordInput
                    name="passwordConfirm"
                    label={t("changePassword.confirmPasswordLabel")}
                    placeholder={t("changePassword.confirmPasswordPlaceholder")}
                    textContentType="newPassword"
                  />
                </View>

                <Button
                  text={
                    loading
                      ? t("changePassword.submitting")
                      : t("changePassword.submit")
                  }
                  onPress={handleSubmit(onSubmit)}
                  loading={loading}
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
