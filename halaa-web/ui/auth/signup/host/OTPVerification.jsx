"use client";
import React, { useState, useEffect } from "react";
import styles from "@/ui/auth/login/form/form.module.css";
import { useTranslation } from "react-i18next";
import ConfirmBtn from "@/ui/commen/confirmButton/ConfirmBtn";
import { useAuthMutation } from "@/hooks/auth";
import OtpInput from "@/ui/auth/login/form/otpInput/OtpInput";
import { parseError, getAuthErrorMessage } from "@/services/errorHandlingService";
import useLanguageChange from "@/hooks/UseLanguageChange";

const OTPVerification = ({ phoneNumber, onBack, type = "signup" }) => {
  const { t } = useTranslation("signup");
  const { t: tCommon } = useTranslation("common");
  const { currentLocale } = useLanguageChange();
  const {
    mutateAsync: verifyOTP,
    isPending: isVerifying,
    error,
  } = useAuthMutation("verifySignupOTP");
  const { mutateAsync: resendOTP, isPending: isResendingOTP } =
    useAuthMutation("resendOTP");

  // Route the mutation error through i18n so the user sees Arabic
  // copy for OTP_ERROR.invalid / expired / cooldown / send_failed
  // instead of the backend's English fallback string.
  const resolveAuthError = (rawError) => {
    if (!rawError) return "";
    const parsed = parseError(rawError);
    const resolved = getAuthErrorMessage(parsed, tCommon);
    return resolved?.message || rawError.message || "";
  };

  const isLoading = isVerifying;
  const errorMessage = resolveAuthError(error);

  const [verificationCode, setVerificationCode] = useState({
    value: ["", "", "", "", "", ""],
  });
  const [localError, setLocalError] = useState("");

  const displayError = errorMessage || localError;

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const otpCode = verificationCode.value.join("");
    if (otpCode.length === 6) {
      handleSubmit();
    }
  }, [verificationCode]);

  // Handle submit
  const handleSubmit = async () => {
    setLocalError("");

    const otpCode = verificationCode.value.join("");

    if (otpCode.length !== 6) {
      setLocalError(
        t("signupForm.hostSignup.otp.enterCode") ||
        "Please enter the 6-digit code"
      );
      return;
    }

    try {
      const result = await verifyOTP({ phoneNumber, otp: otpCode, type });

      // The mutation commits the auth-routing cookies and Zustand snapshot
      // before it resolves. Use a full navigation so Next middleware sees the
      // new cookies and the HttpOnly session is available on the first render
      // of the protected profile-completion route.
      if (result?.profileCompleted === false) {
        window.location.replace(
          `/${currentLocale}/signup/continue-signup`
        );
      } else {
        window.location.replace(`/${currentLocale}/host`);
      }
    } catch (err) {
      setLocalError(
        resolveAuthError(err) ||
        t("signupForm.hostSignup.otp.invalidCode") ||
        "Invalid code"
      );
      // Clear OTP on error
      setVerificationCode({ value: ["", "", "", "", "", ""] });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <OtpInput
          verificationCode={verificationCode}
          setVerificationCode={setVerificationCode}
          onGoBack={onBack}
          phoneNumber={phoneNumber}
          onResend={() =>
            resendOTP({ phoneNumber, type: "signup" })
          }
          isResending={isResendingOTP}
        />

        {/* Error message */}
        {displayError && (
          <div
            className={styles.error_message}
            style={{ marginTop: "1rem", textAlign: "center" }}
          >
            {displayError}
          </div>
        )}

        {/* Submit button */}
        <ConfirmBtn
          text={t("signupForm.hostSignup.otp.verify") || "Verify"}
          active={
            verificationCode.value.every((digit) => digit !== "") && !isLoading
          }
          clickHandler={handleSubmit}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default OTPVerification;
