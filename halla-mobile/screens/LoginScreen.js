import React, { useState } from "react";
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
import { useTranslation } from "../localization";
import { useAuthStore } from "../stores/authStore";
import { useToast } from "../contexts/ToastContext";
import {
  EmailLoginForm,
  MobileLoginForm,
  OTPVerificationForm,
} from "../components/auth";
import TopBar from "../components/plans/TopBar";

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const { loginWithEmail, sendOTP, verifyOTP, status, getTempMobile } =
    useAuthStore();
  const [step, setStep] = useState("input");
  const [loginMethod, setLoginMethod] = useState("mobile"); // mobile or email
  const loading = status === "loading";

  const handleEmailLogin = async (data) => {
    const result = await loginWithEmail(data);
    if (!result.success) {
      toast.error(result.error || t("errors.loginFailed"));
      return { success: false, fieldErrors: { email: result.error } };
    }
    return result;
  };

  const handleMobileLogin = async (data) => {
    const result = await sendOTP({ ...data, type: "login" });
    if (result.success) {
      setStep("otp");
    } else {
      toast.error(result.error || t("errors.otpFailed"));
      return { success: false, fieldErrors: { mobile: result.error } };
    }
    return result;
  };

  const handleOTPVerification = async (data) => {
    const result = await verifyOTP(data);
    if (!result.success) {
      toast.error(result.error || t("errors.otpFailed"));
      return { success: false, fieldErrors: { otp: result.error } };
    }
    return result;
  };

  const switchMethod = () => {
    setLoginMethod((m) => (m === "mobile" ? "email" : "mobile"));
    setStep("input");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("login.title")} showBack={true} />
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
                        onPress={() => navigation.navigate("ForgetPassword")}
                        style={styles.forgotPassword}
                      >
                        <Text style={styles.forgotPasswordText}>
                          {t("login.forgotPassword")}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity onPress={switchMethod} style={styles.switchMethod}>
                    <Text style={styles.switchMethodText}>
                      {loginMethod === "mobile"
                        ? t("login.loginWithEmail") || "Login with Email"
                        : t("login.loginWithMobile") || "Login with Mobile"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>{t("login.noAccount")} </Text>
                    <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                      <Text style={styles.signupLink}>{t("login.signUp")}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <OTPVerificationForm
                  onSubmit={handleOTPVerification}
                  onEditPhone={() => setStep("input")}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#C28E5C",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 40,
  },
  content: {
    paddingHorizontal: width > 768 ? 80 : width > 480 ? 40 : 24,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
  switchMethod: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  switchMethodText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#666",
  },
  signupLink: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
});
