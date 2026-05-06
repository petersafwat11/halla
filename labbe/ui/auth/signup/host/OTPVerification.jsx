"use client";
import React, { useState, useEffect } from "react";
import styles from "@/ui/auth/login/form/form.module.css";
import { useTranslation } from "react-i18next";
import FormHeader from "../../../commen/formHeader/FormHeader";
import ConfirmBtn from "@/ui/commen/confirmButton/ConfirmBtn";
import { useAuthMutation } from "@/hooks/reactQueryHooks/useAuthMutation";
import OtpInput from "@/ui/auth/login/form/otpInput/OtpInput";

const OTPVerification = ({ phoneNumber, onBack, type = "signup" }) => {
  const { t } = useTranslation("signup");
  const {
    mutateAsync: verifyOTP,
    isPending: isVerifying,
    error,
  } = useAuthMutation("verifySignupOTP");

  const isLoading = isVerifying;
  const errorMessage = error?.message || "";

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
      await verifyOTP({ phoneNumber, otp: otpCode, type });
      // Success redirect is handled by mutation onSuccess
    } catch (error) {
      setLocalError(
        error.message ||
        t("signupForm.hostSignup.otp.invalidCode") ||
        "Invalid code"
      );
      // Clear OTP on error
      setVerificationCode({ value: ["", "", "", "", "", ""] });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.form_header}>
        <FormHeader />
      </div>
      <div className={styles.form}>
        <OtpInput
          verificationCode={verificationCode}
          setVerificationCode={setVerificationCode}
          onGoBack={onBack}
          phoneNumber={phoneNumber}
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
