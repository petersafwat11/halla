import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import KeyboardAwareFormScrollView from "../../components/commen/keyboard/KeyboardAwareFormScrollView";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { ForgetPasswordForm, EmailSentView } from "../../components/auth";
import TopBar from "../../components/plans/TopBar";
import LocalizedText from "../../components/commen/LocalizedText";
import { authErrorMessage } from "../../services/authErrors";

const { width } = Dimensions.get("window");

export default function ForgetPasswordScreen({ navigation }) {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const { forgotPassword, status } = useAuthStore();
  const [step, setStep] = useState("input");
  const loading = status === "loading";
  const [resendDisabled, setResendDisabled] = useState(false);

  const handleSubmit = async (data) => {
    const result = await forgotPassword(data);
    if (result.success) {
      toast.success(t("forgetPassword.emailSentDescription"));
      setStep("sent");
    } else {
      const resolved = authErrorMessage(result.errorDetail, t);
      const msg = resolved?.message || result.error || t("errors.resetFailed");
      toast.error(msg);
      return { success: false, fieldErrors: { email: msg } };
    }
    return result;
  };

  const handleResend = useCallback(async () => {
    setResendDisabled(true);
    toast.info(t("forgetPassword.resendLink"));
    setTimeout(() => {
      setResendDisabled(false);
    }, 60000);
  }, [t, toast]);

  const handleBackToLogin = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("forgetPassword.title")} showBack={true} onBack={handleBackToLogin} />

        {/* One shared owner for the form region (§8.2 auth row): TopBar is a
            sibling above it, so no header offset compensation is needed. */}
        <KeyboardAwareFormScrollView
          style={styles.keyboardView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            {step === "input" ? (
              <ForgetPasswordForm onSubmit={handleSubmit} loading={loading} />
            ) : (
              <EmailSentView
                onResend={handleResend}
                resendDisabled={resendDisabled}
              />
            )}

            {step === "input" && (
              <TouchableOpacity
                onPress={handleBackToLogin}
                style={styles.backToLoginButton}
              >
                <LocalizedText style={styles.backToLoginText}>
                  {t("forgetPassword.backToLogin")}
                </LocalizedText>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAwareFormScrollView>
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
    paddingVertical: 80,
  },
  content: {
    paddingHorizontal: width > 768 ? 80 : width > 480 ? 40 : 24,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  backToLoginButton: {
    marginTop: 24,
    alignItems: "center",
  },
  backToLoginText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
});
