/**
 * Reset-password completion screen.
 *
 * Lands here from a deep link such as:
 *   - `halla://reset-password/<token>`            (custom scheme)
 *   - `https://halaa.com.sa/reset-password/<token>` (universal/app link)
 *
 * The token is read from `route.params.token`. On success the backend
 * issues a fresh token pair and the auth store transitions to
 * `authenticated`, so the navigator's root-state effect lands the user
 * on the correct home tab automatically.
 *
 * Deep-link wiring: see `linking` config in `App.js` /
 * `navigation/linking.js`. The Expo `app.json` should declare
 * `scheme: "halla"` and `intentFilters` / `associatedDomains` for the
 * universal-link variant.
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
import { resetPasswordSchema } from "@halla/shared/schemas/auth";
import { authErrorMessage } from "../../services/authErrors";
import TopBar from "../../components/plans/TopBar";

const { width } = Dimensions.get("window");

export default function ResetPasswordScreen({ route, navigation }) {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const { resetPassword, status } = useAuthStore();
  const loading = status === "loading";

  const token = route?.params?.token;

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState({});

  const submit = useCallback(async () => {
    setErrors({});
    if (!token) {
      toast.error(t("changePassword.tokenMissing"));
      return;
    }
    const schema = resetPasswordSchema(t);
    const parsed = schema.safeParse({ password, passwordConfirm });
    if (!parsed.success) {
      const fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path?.[0];
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const result = await resetPassword({ token, password, passwordConfirm });
    if (result.success) {
      toast.success(t("changePassword.success"));
      // Auth store transitions to authenticated — root navigator handles routing.
    } else {
      const resolved = authErrorMessage(result.errorDetail, t);
      toast.error(resolved?.message || result.error || t("errors.resetFailed"));
    }
  }, [password, passwordConfirm, token, resetPassword, t, toast]);

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
              <Text style={styles.heading}>
                {t("changePassword.heading")}
              </Text>
              <Text style={styles.body}>
                {t("changePassword.description")}
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {t("changePassword.newPasswordLabel")}
                </Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("changePassword.newPasswordPlaceholder")}
                  placeholderTextColor="#999"
                />
                {errors.password ? (
                  <Text style={styles.errorText}>{errors.password}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {t("changePassword.confirmPasswordLabel")}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.passwordConfirm && styles.inputError,
                  ]}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  placeholder={t("changePassword.confirmPasswordPlaceholder")}
                  placeholderTextColor="#999"
                />
                {errors.passwordConfirm ? (
                  <Text style={styles.errorText}>{errors.passwordConfirm}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={submit}
                disabled={loading}
                style={[styles.submit, loading && styles.submitDisabled]}
              >
                <Text style={styles.submitText}>
                  {loading
                    ? t("changePassword.submitting")
                    : t("changePassword.submit")}
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
