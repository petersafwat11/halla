/**
 * Whitelabel post-approval setup-password screen.
 *
 * Flow:
 *   1. Admin approves a whitelabel signup on web. The backend mints a
 *      one-time `passwordSetupToken` and the whitelabel admin receives
 *      an email containing a link `${frontend.url}/setup-password/<token>`.
 *   2. On mobile, the email link can deep-link via the `halla://`
 *      scheme to `halla://setup-password/<token>` (configured via
 *      React Navigation `linking` in App.js).
 *   3. This screen accepts the token via route param (or via the deep
 *      link's path), the user picks a password, and we POST it to
 *      `/auth/setup-password`. On success we authenticate the new
 *      session via the existing auth store and route to the home tab.
 *
 * Manual paste path: if a user installs the app fresh and the email link
 * can't auto-open it, they can paste the token into the input field.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { setupPassword as setupPasswordAPI } from "../../hooks/auth/_api";
import { authErrorMessage } from "../../services/authErrors";
import TopBar from "../../components/plans/TopBar";

const MIN_PASSWORD_LENGTH = 8;

const SetupPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const { t } = useTranslation("auth");

  // Token can arrive via:
  //   - route param `token`            (manual navigation / deep-link)
  //   - route param `params.token`     (nested under `params` for deep-links)
  const initialToken = route?.params?.token || "";

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Update token if the route param changes (deep-link can re-fire while
  // the screen is already mounted).
  useEffect(() => {
    if (initialToken && initialToken !== token) setToken(initialToken);
    // We intentionally don't include `token` in deps to avoid clobbering
    // the user's manual edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  // .trim() the token at validation time so copy-paste that captured
  // surrounding whitespace doesn't fail the length-only sanity check.
  const trimmedToken = token.trim();
  const tokenLooksValid = trimmedToken.length >= 16;
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
  const matches = password === passwordConfirm;
  const canSubmit = useMemo(
    () => tokenLooksValid && passwordValid && matches && !submitting,
    [tokenLooksValid, passwordValid, matches, submitting]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await setupPasswordAPI({
        token: trimmedToken,
        password,
        passwordConfirm,
      });
      // Persist via the auth store so the user is logged in immediately.
      const persist = useAuthStore.getState()._persistAuth;
      const role = result?.user?.role;
      if (!role) {
        const err = new Error("Server response is missing user.role");
        err.code = "INTERNAL_ERROR";
        err.status = 500;
        throw err;
      }
      await persist({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        role,
      });
      toast.success(t("setupPassword.successToast"));
      // The root navigator will react to the new authenticated state.
    } catch (error) {
      console.error("[SetupPasswordScreen] setup failed:", error);
      const resolved = authErrorMessage(error, t);
      const msg = resolved?.message || error?.message || t("setupPassword.failureFallback");
      // Token-expired path is a different recovery: the user can't fix
      // the form, they need a fresh setup email. Toast + offer a navigate
      // back to forget-password; non-token errors stay as toast on this
      // screen so the user can fix and retry without losing input.
      if (resolved?.code === "TOKEN_INVALID_OR_EXPIRED") {
        Alert.alert(
          t("setupPassword.failureTitle"),
          msg,
          [
            { text: t("common.back"), style: "cancel" },
            {
              text: t("authErrors.requestNewLinkAction"),
              onPress: () => navigation.navigate("ForgetPassword"),
            },
          ],
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar
        title={t("setupPassword.title")}
        showBack
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.kbContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroIconWrap}>
            <Ionicons name="lock-closed-outline" size={40} color="#C28E5C" />
          </View>
          <Text style={styles.title}>{t("setupPassword.heading")}</Text>
          <Text style={styles.subtitle}>{t("setupPassword.subtitle")}</Text>

          {/* Token field — pre-filled from deep link, editable for manual paste. */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{t("setupPassword.tokenLabel")}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={token}
                onChangeText={setToken}
                placeholder={t("setupPassword.tokenPlaceholder")}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>
              {t("setupPassword.passwordLabel")}
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t("setupPassword.passwordPlaceholder")}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#656565"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>
              {t("setupPassword.passwordConfirmLabel")}
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                placeholder={t("setupPassword.passwordConfirmPlaceholder")}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>
            {!matches && passwordConfirm.length > 0 ? (
              <Text style={styles.errorText}>
                {t("setupPassword.mismatchError")}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>
                  {t("setupPassword.submit")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footnote}>{t("setupPassword.footnote")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#C28E5C" },
  kbContainer: { flex: 1, backgroundColor: "#F9F4EF" },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 80 },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F5ECE4",
  },
  title: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    marginBottom: 6,
    textAlign: "right",
  },
  inputWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F5ECE4",
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    textAlign: "right",
  },
  errorText: {
    color: "#C0392B",
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  submitBtn: {
    backgroundColor: "#C28E5C",
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },
  footnote: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
});

export default SetupPasswordScreen;
