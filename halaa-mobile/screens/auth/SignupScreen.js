import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
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
  SignupMobileForm,
  OTPVerificationForm,
  CompleteProfileForm,
} from "../../components/auth";
import RoleSelectionView from "../../components/auth/RoleSelectionView";
import TopBar from "../../components/plans/TopBar";
import LegalLinks from "../../components/legal/LegalLinks";
import DirectionalIonicon from "../../components/common/DirectionalIonicon";
import LocalizedText from "../../components/commen/LocalizedText";

const { width } = Dimensions.get("window");

export default function SignupScreen({ navigation }) {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const {
    signupWithPhone,
    verifySignupOTP,
    completeProfile,
    signupVendor,
    resendOTP,
    status,
    getTempMobile,
    tempMobile,
  } = useAuthStore();

  const [userRole, setUserRole] = useState("host"); // host or vendor
  const [step, setStep] = useState("role"); // role, mobile, otp, complete, vendor
  const loading = status === "loading";

  const handleRoleSelection = (role) => {
    setUserRole(role);
    if (role === "host") {
      setStep("mobile");
    } else if (role === "vendor") {
      navigation.navigate("VendorSignup");
    }
  };

  // Map the store's structured `errorDetail` to a localized message and
  // attach it inline on the field the backend named (e.g. `email` for a
  // duplicate-email conflict) instead of dumping a generic toast.
  const resolveError = (result, fallbackKey) => {
    const resolved = authErrorMessage(result?.errorDetail, t);
    return resolved?.message || result?.error || t(fallbackKey);
  };

  const fieldKeyFor = (apiField) => {
    if (apiField === "email") return "email";
    if (apiField === "phoneNumber" || apiField === "phone") return "mobile";
    if (apiField === "username") return "username";
    return null;
  };

  const handleMobileSubmit = async (data) => {
    const result = await signupWithPhone(data);
    if (result.success) {
      toast.success(t("otp.description"));
      setStep("otp");
    } else {
      const msg = resolveError(result, "errors.signupFailed");
      toast.error(msg);
      return { success: false, fieldErrors: { mobile: msg } };
    }
    return result;
  };

  const handleOTPVerification = async (data) => {
    const result = await verifySignupOTP(data);
    if (result.success) {
      toast.success(t("otp.verified"));
      setStep("complete");
    } else {
      const msg = resolveError(result, "errors.otpFailed");
      toast.error(msg);
      // A phone conflict surfaces at OTP verify too; route it back to
      // the mobile field via fieldErrors so the form highlights correctly.
      const target = fieldKeyFor(result?.errorDetail?.field) || "otp";
      return { success: false, fieldErrors: { [target]: msg } };
    }
    return result;
  };

  const handleCompleteProfile = async (data) => {
    const result = await completeProfile(data);
    if (result.success) {
      toast.success(t("signup.signupButton") + " " + t("common.success"));
    } else {
      const msg = resolveError(result, "errors.signupFailed");
      toast.error(msg);
      const target = fieldKeyFor(result?.errorDetail?.field) || "email";
      return { success: false, fieldErrors: { [target]: msg } };
    }
    return result;
  };

  const handleVendorSignup = async (data) => {
    const result = await signupVendor(data);
    if (result.success) {
      toast.success(t("signup.signupButton") + " " + t("common.success"));
    } else {
      const msg = resolveError(result, "errors.signupFailed");
      toast.error(msg);
      const target = fieldKeyFor(result?.errorDetail?.field) || "email";
      return { success: false, fieldErrors: { [target]: msg } };
    }
    return result;
  };

  const handleEditPhone = () => {
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
              <DirectionalIonicon name="arrow-back" size={18} color="#c28e5c" />
              <LocalizedText style={styles.backButtonText}>
                {t("common.back")}
              </LocalizedText>
            </TouchableOpacity>
            <SignupMobileForm onSubmit={handleMobileSubmit} loading={loading} />
            {/* Login link — two adjacent runs in one logical row, never a
                concatenated string, so each run keeps its own direction. */}
            <View style={styles.loginContainer}>
              <LocalizedText style={styles.loginText}>
                {t("signup.hasAccount")}
              </LocalizedText>
              <TouchableOpacity onPress={handleLogin}>
                <LocalizedText style={styles.loginLink}>
                  {t("signup.signIn")}
                </LocalizedText>
              </TouchableOpacity>
            </View>
          </>
        );

      case "otp":
        return (
          <OTPVerificationForm
            onSubmit={handleOTPVerification}
            onEditPhone={handleEditPhone}
            onResend={async () => {
              const result = await resendOTP({ type: "signup" });
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
          <View style={styles.content}>
            {renderStep()}
            {/* Unauthenticated legal disclosure — opens the canonical web pages
                (same shared content the in-app legal screens render). */}
            <LegalLinks
              prefix={t("signup.legalNotice")}
              docTypes={["terms", "privacy", "community-rules"]}
            />
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    gap: 6,
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
