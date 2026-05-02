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
import { ForgetPasswordForm, EmailSentView } from "../components/auth";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../components/plans/TopBar";

const { width } = Dimensions.get("window");

export default function ForgetPasswordScreen({ navigation }) {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const { forgotPassword, status } = useAuthStore();
  const [step, setStep] = useState("input"); // input or sent
  const loading = status === "loading";
  const [resendDisabled, setResendDisabled] = useState(false);

  const handleSubmit = async (data) => {
    const result = await forgotPassword(data);
    if (result.success) {
      toast.success(t("forgetPassword.emailSentDescription"));
      setStep("sent");
    } else {
      toast.error(result.error || t("errors.resetFailed"));
      return { success: false, fieldErrors: { email: result.error } };
    }
    return result;
  };

  const handleGoToEmail = () => {
    console.log("Go to Email App");
    // Here you would open the email app
  };

  const handleResend = async () => {
    setResendDisabled(true);
    // You can call forgotPassword again here if needed
    toast.info(t("forgetPassword.resendLink"));
    setTimeout(() => {
      setResendDisabled(false);
    }, 60000); // 60 seconds
  };

  const handleBackToLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("forgetPassword.title")} showBack={true} />
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
        <Ionicons name="arrow-back" size={24} color="#2c2c2c" />
      </TouchableOpacity>

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
              <ForgetPasswordForm onSubmit={handleSubmit} loading={loading} />
            ) : (
              <EmailSentView
                onGoToEmail={handleGoToEmail}
                onResend={handleResend}
                resendDisabled={resendDisabled}
              />
            )}

            {/* Back to Login Link */}
            {step === "input" && (
              <TouchableOpacity
                onPress={handleBackToLogin}
                style={styles.backToLoginButton}
              >
                <Text style={styles.backToLoginText}>
                  {t("forgetPassword.backToLogin")}
                </Text>
              </TouchableOpacity>
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
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
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
