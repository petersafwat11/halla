"use client";
import React, { useState } from "react";
import styles from "@/ui/auth/login/form/form.module.css";
import { useTranslation } from "react-i18next";
import ConfirmBtn from "@/ui/commen/confirmButton/ConfirmBtn";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { hostSignupSchema } from "@halaa/shared/schemas/auth";
import Link from "next/link";
import useLanguageChange from "@/hooks/UseLanguageChange";
import { useAuthMutation } from "@/hooks/auth";
import useAuthStore from "@/stores/authStore";
import MobileInputGroup from "@/ui/commen/inputs/mobileInputGroup/MobileInputGroup";
import OTPVerification from "./OTPVerification";
import ErrorDisplay from "@/ui/commen/ErrorDisplay";
import { getAuthErrorMessage } from "@/services/errorHandlingService";

const Form = () => {
  const { t } = useTranslation("signup");
  const { t: tCommon } = useTranslation("common");
  const { currentLocale } = useLanguageChange();

  // Auth mutations
  const {
    mutateAsync: sendSignupOTP,
    isPending: isSendingOTP,
    error: sendOTPError,
  } = useAuthMutation("sendSignupOTP");

  const isLoading = isSendingOTP;
  const rawError = sendOTPError?.parsedError || null;
  const mutationErrorInfo = getAuthErrorMessage(rawError, tCommon);
  const mutationError = mutationErrorInfo?.message || "";

  // Auth store for OTP state
  const { otpSent, otpPhone, clearOTPState } = useAuthStore();

  const [localError, setLocalError] = useState("");

  const error = mutationError || localError;

  // Greeting styles
  const greetingStyles = {
    container: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: "1.6rem",
    },
    title: {
      color: "var(--color-title)",
      fontSize: "2.4rem",
      fontWeight: 600,
      lineHeight: "2.8rem",
    },
  };

  const methods = useForm({
    resolver: zodResolver(hostSignupSchema(t)),
    mode: "onBlur",
    defaultValues: {
      phoneNumber: "",
    },
  });

  const { handleSubmit, watch } = methods;
  const formValues = watch();

  // Handle phone number submission - sends OTP
  const onSubmit = async (formData) => {
    setLocalError("");

    try {
      await sendSignupOTP(formData.phoneNumber);
      // If successful, otpSent will be true and OTP screen will show
    } catch (error) {
      const resolved = getAuthErrorMessage(error.parsedError || null, tCommon);
      setLocalError(
        resolved?.message || error.message || t("signupForm.errors.generic")
      );
    }
  };

  // Handle back from OTP screen
  const handleBackFromOTP = () => {
    clearOTPState();
    setLocalError("");
  };

  const isFormValid = () => {
    return (
      formValues.phoneNumber && formValues.phoneNumber.length >= 9 && !isLoading
    );
  };

  // Show OTP verification screen if OTP was sent
  if (otpSent && otpPhone) {
    return (
      <OTPVerification
        phoneNumber={otpPhone}
        onBack={handleBackFromOTP}
        type="signup"
      />
    );
  }

  return (
    <div className={styles.container}>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} key="host-signup-form">
          <div className={styles.form}>
            {/* Greeting Section */}
            <div style={greetingStyles.container}>
              <h2 style={greetingStyles.title}>
                {t("signupForm.hostSignup.greeting.title")}
              </h2>
            </div>

            <MobileInputGroup
              label={t("signupForm.hostSignup.phoneNumber")}
              type="text"
              name="phoneNumber"
            />

            {error && (
              <ErrorDisplay
                error={error}
                type={mutationErrorInfo?.type || "validation"}
                field={mutationErrorInfo?.field}
                actionLink={
                  mutationErrorInfo?.actionLink
                    ? `/${currentLocale}/login`
                    : null
                }
                actionText={
                  mutationErrorInfo?.actionLink
                    ? tCommon("authErrors.loginAction")
                    : null
                }
              />
            )}

            <ConfirmBtn
              text={
                t("signupForm.hostSignup.buttons.sendCode") ||
                t("signupForm.hostSignup.buttons.createAccount")
              }
              active={isFormValid()}
              clickHandler={handleSubmit(onSubmit)}
              disabled={isLoading}
            />

            <button type="button" className={styles.sign_up_button}>
              {t("signupForm.hostSignup.formBottom.haveAccount")}{" "}
              <Link
                href={`/${currentLocale}/login`}
                className={styles.make_acc}
              >
                {t("signupForm.hostSignup.formBottom.login")}
              </Link>
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default Form;
