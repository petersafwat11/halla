import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { authErrorMessage } from "../../services/authErrors";
import {
  EmailLoginForm,
  MobileLoginForm,
  OTPVerificationForm,
} from "../../components/auth";
import TopBar from "../../components/plans/TopBar";

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const { loginWithEmail, sendOTP, verifyOTP, resendOTP, status, getTempMobile } =
    useAuthStore();
  const [step, setStep] = useState("input");
  const [loginMethod, setLoginMethod] = useState("mobile");
  const loading = status === "loading";

  // Resolve the store's structured error (errorDetail) through i18n so
  // the user sees Arabic copy for locked / suspended / OTP_*  /
  // network errors instead of the backend's English fallback.
  const resolveError = useCallback((result, fallbackKey) => {
    const resolved = authErrorMessage(result?.errorDetail, t);
    return resolved?.message || result?.error || t(fallbackKey);
  }, [t]);

  const handleEmailLogin = useCallback(async (data) => {
    const result = await loginWithEmail(data);
    if (!result.success) {
      const msg = resolveError(result, "errors.loginFailed");
      toast.error(msg);
      const detail = result.errorDetail;
      const fieldErrors = {};
      if (detail?.field === "email" || detail?.code === "UNAUTHORIZED") fieldErrors.email = msg;
      if (detail?.field === "phoneNumber") fieldErrors.mobile = msg;
      return { success: false, fieldErrors };
    }
    return result;
  }, [loginWithEmail, toast, t, resolveError]);

  const handleMobileLogin = useCallback(async (data) => {
    const result = await sendOTP({ ...data, type: "login" });
    if (result.success) {
      setStep("otp");
    } else {
      const msg = resolveError(result, "errors.otpFailed");
      toast.error(msg);
      return { success: false, fieldErrors: { mobile: msg } };
    }
    return result;
  }, [sendOTP, toast, t, resolveError]);

  const handleOTPVerification = useCallback(async (data) => {
    const result = await verifyOTP(data);
    if (!result.success) {
      const msg = resolveError(result, "errors.otpFailed");
      toast.error(msg);
      return { success: false, fieldErrors: { otp: msg } };
    }
    return result;
  }, [verifyOTP, toast, t, resolveError]);

  const switchMethod = useCallback(() => {
    setLoginMethod((m) => (m === "mobile" ? "email" : "mobile"));
    setStep("input");
  }, []);

  const handleForgotPassword = useCallback(() => {
    navigation.navigate("ForgetPassword");
  }, [navigation]);

  const handleSignup = useCallback(() => {
    navigation.navigate("Signup");
  }, [navigation]);

  const handleEditPhone = useCallback(() => {
    setStep("input");
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("login.title", "أهلا بعودتك!")} showBack={true} />
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
              {step === "input" ? (
                <>
                  {loginMethod === "mobile" ? (
                    <MobileLoginForm onSubmit={handleMobileLogin} loading={loading} />
                  ) : (
                    <>
                      <EmailLoginForm onSubmit={handleEmailLogin} loading={loading} />
                      <TouchableOpacity
                        onPress={handleForgotPassword}
                        style={styles.forgotPassword}
                      >
                        <Text style={styles.forgotPasswordText}>
                          {t("login.forgotPassword", "نسيت كلمة المرور؟")}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity onPress={switchMethod} style={styles.switchMethod}>
                    <Text style={styles.switchMethodText}>
                      {loginMethod === "mobile"
                        ? t("login.loginWithEmail", "تسجيل الدخول بالبريد الإلكتروني")
                        : t("login.loginWithMobile", "تسجيل الدخول بالهاتف")}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>{t("login.noAccount", "ليس لديك حساب؟")} </Text>
                    <TouchableOpacity onPress={handleSignup}>
                      <Text style={styles.signupLink}>{t("login.signUp", "إنشاء حساب")}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <OTPVerificationForm
                  onSubmit={handleOTPVerification}
                  onEditPhone={handleEditPhone}
                  onResend={async () => {
                    const result = await resendOTP({ type: "login" });
                    if (!result.success) {
                      const msg = resolveError(result, "errors.otpFailed");
                      toast.error(msg);
                      throw new Error(msg);
                    }
                    return { cooldownSeconds: result.cooldownSeconds };
                  }}
                  phoneNumber={`+966${getTempMobile()}`}
                  loading={loading}
                />
              )}
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
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 40 },
  content: {
    paddingHorizontal: width > 768 ? 80 : width > 480 ? 40 : 24,
    maxWidth: 600, width: "100%", alignSelf: "center",
  },
  forgotPassword: { alignSelf: "flex-end", marginTop: 8, marginBottom: 24 },
  forgotPasswordText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#c28e5c" },
  switchMethod: { alignItems: "center", marginTop: 16, marginBottom: 8 },
  switchMethodText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#c28e5c" },
  signupContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  signupText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: "#666" },
  signupLink: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#c28e5c" },
});
