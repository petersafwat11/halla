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
  SignupMobileForm,
  OTPVerificationForm,
  CompleteProfileForm,
} from "../components/auth";
import RoleSelectionView from "../components/auth/RoleSelectionView";
import TopBar from "../components/plans/TopBar";

const { width } = Dimensions.get("window");

export default function SignupScreen({ navigation }) {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const {
    signupWithPhone,
    verifySignupOTP,
    completeProfile,
    signupVendor,
    status,
    getTempMobile,
    tempMobile,
  } = useAuthStore();

  const [userRole, setUserRole] = useState("host"); // host or vendor
  const [step, setStep] = useState("role"); // role, mobile, otp, complete, vendor
  const loading = status === "loading";

  // Debug: Log step and status changes
  React.useEffect(() => {
    console.log("[SIGNUP] Step changed to:", step);
    console.log("[SIGNUP] Status:", status);
    console.log("[SIGNUP] Loading:", loading);
  }, [step, status, loading]);

  const handleRoleSelection = (role) => {
    setUserRole(role);
    if (role === "host") {
      setStep("mobile");
    } else if (role === "vendor") {
      navigation.navigate("VendorSignup");
    } else if (role === "whitelabel") {
      navigation.navigate("WhitelabelSignup");
    }
  };

  const handleMobileSubmit = async (data) => {
    console.log("[SIGNUP] Submitting phone:", data);
    const result = await signupWithPhone(data);
    console.log("[SIGNUP] Result:", result);
    if (result.success) {
      console.log("[SIGNUP] Success! Moving to OTP step");
      toast.success(t("otp.description"));
      setStep("otp");
    } else {
      console.log("[SIGNUP] Failed:", result.error);
      toast.error(result.error || t("errors.signupFailed"));
      return { success: false, fieldErrors: { mobile: result.error } };
    }
    return result;
  };

  const handleOTPVerification = async (data) => {
    console.log("[SIGNUP] Verifying OTP:", data);
    const result = await verifySignupOTP(data);
    console.log("[SIGNUP] OTP verification result:", result);
    if (result.success) {
      console.log("[SIGNUP] OTP verified! Moving to complete profile");
      toast.success(t("otp.verified"));
      setStep("complete");
    } else {
      console.log("[SIGNUP] OTP verification failed:", result.error);
      toast.error(result.error || t("errors.otpFailed"));
      return { success: false, fieldErrors: { otp: result.error } };
    }
    return result;
  };

  const handleCompleteProfile = async (data) => {
    console.log("[SIGNUP] Submitting complete profile:", data);
    const result = await completeProfile(data);
    console.log("[SIGNUP] Complete profile result:", result);
    if (result.success) {
      console.log("[SIGNUP] Complete profile success!");
      toast.success(t("signup.signupButton") + " " + t("common.success"));
      // Navigation handled automatically by AppNavigator
    } else {
      console.log("[SIGNUP] Complete profile failed:", result.error);
      toast.error(result.error || t("errors.signupFailed"));
      return { success: false, fieldErrors: { email: result.error } };
    }
    return result;
  };

  const handleVendorSignup = async (data) => {
    console.log("[SIGNUP] Submitting vendor signup:", data);
    const result = await signupVendor(data);
    console.log("[SIGNUP] Vendor signup result:", result);
    if (result.success) {
      console.log("[SIGNUP] Vendor signup success!");
      toast.success(t("signup.signupButton") + " " + t("common.success"));
      // Navigation handled automatically by AppNavigator
    } else {
      console.log("[SIGNUP] Vendor signup failed:", result.error);
      toast.error(result.error || t("errors.signupFailed"));
      return { success: false, fieldErrors: { email: result.error } };
    }
    return result;
  };

  const handleEditPhone = () => {
    console.log("[SIGNUP] Editing phone");
    setStep("mobile");
  };

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  const handleBackToRole = () => {
    setStep("role");
  };

  const renderStep = () => {
    switch (step) {
      case "role":
        return (
          <RoleSelectionView
            onSelectRole={handleRoleSelection}
            onLogin={handleLogin}
          />
        );

      case "mobile":
        return (
          <>
            <TouchableOpacity
              onPress={handleBackToRole}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← {t("common.back")}</Text>
            </TouchableOpacity>
            <SignupMobileForm onSubmit={handleMobileSubmit} loading={loading} />
            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t("signup.hasAccount")} </Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={styles.loginLink}>{t("signup.signIn")}</Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case "otp":
        return (
          <OTPVerificationForm
            onSubmit={handleOTPVerification}
            onEditPhone={handleEditPhone}
            phoneNumber={`+966${getTempMobile()}`}
            loading={loading}
          />
        );

      case "complete":
        return (
          <CompleteProfileForm
            onSubmit={handleCompleteProfile}
            loading={loading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("signup.title")} showBack={true} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>{renderStep()}</View>
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
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#666",
  },
  loginLink: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
});
