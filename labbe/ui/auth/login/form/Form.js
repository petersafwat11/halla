"use client";
import React, { useEffect, useState } from "react";
import styles from "./form.module.css";
import { useTranslation } from "react-i18next";
import FormBottom from "./formBottom/FormBottom";
import Greating from "./Greating/Greating";
import ConfirmBtn from "@/ui/commen/confirmButton/ConfirmBtn";
import OtpInput from "./otpInput/OtpInput";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailLoginSchema, phoneLoginSchema } from "@halla/shared/schemas/auth";
import EmailSection from "./EmailForm";
import PhoneSection from "./PhoneForm";
import { useAuthMutation } from "@/hooks/auth";
import useAuthStore, { USER_ROLES } from "@/stores/authStore";
import useLanguageChange from "@/hooks/UseLanguageChange";
import { getAuthErrorMessage } from "@/services/errorHandlingService";

const Form = () => {
  const { t } = useTranslation("login");
  const { t: tCommon } = useTranslation("common");
  const { currentLocale } = useLanguageChange();

  // Auth mutations
  const {
    mutateAsync: sendLoginOTP,
    isPending: isSendingOTP,
    error: sendOTPError,
  } = useAuthMutation("sendLoginOTP");

  const { mutateAsync: resendOTP, isPending: isResendingOTP } =
    useAuthMutation("resendOTP");

  const {
    mutateAsync: verifyLoginOTP,
    isPending: isVerifyingOTP,
    error: verifyOTPError,
  } = useAuthMutation("verifyLoginOTP");

  const {
    mutateAsync: login,
    isPending: isLoggingIn,
    error: loginError,
  } = useAuthMutation("login");

  // Combined loading and error states
  const isLoading = isSendingOTP || isVerifyingOTP || isLoggingIn;
  const rawError = sendOTPError?.parsedError || verifyOTPError?.parsedError || loginError?.parsedError || null;
  const mutationErrorInfo = getAuthErrorMessage(rawError, tCommon);
  const mutationError = mutationErrorInfo?.message || "";

  // Get auth store actions
  const { clearOTPState, logout } = useAuthStore();

  const [loginType, setLoginType] = useState("otp");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [localError, setLocalError] = useState("");

  // Use either mutation error or local error
  const error = mutationError || localError;

  const methods = useForm({
    resolver: zodResolver(
      loginType === "otp" ? phoneLoginSchema(t) : emailLoginSchema(t)
    ),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      phoneNumber: "",
    },
  });

  const {
    handleSubmit,
    watch,
    reset,
    clearErrors,
    formState: { isSubmitted },
  } = methods;

  // Reset form when login type changes to clear validation state
  useEffect(() => {
    reset(
      { email: "", password: "", phoneNumber: "" },
      {
        keepErrors: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepDirty: false,
      }
    );
  }, [loginType, reset]);
  const formValues = watch();

  // Navigate based on user role.
  // Full navigation (window.location.href) is intentional: soft router.push
  // does not reliably carry HttpOnly cookies set by the backend origin
  // (different port in dev, or separate domain in prod before same-VPS deploy).
  // A hard redirect guarantees the browser sends all stored cookies with the
  // request so the middleware sees access_token and lets the user through.
  const navigateByRole = (role) => {
    let path;
    switch (role) {
      case USER_ROLES.SUPER_ADMIN:
      case USER_ROLES.ADMIN:
      case USER_ROLES.MODERATOR:
        path = `/${currentLocale}/admin-dash`;
        break;
      case USER_ROLES.VENDOR:
        path = `/${currentLocale}/vendor-dashboard`;
        break;
      case USER_ROLES.HOST:
      default:
        path = `/${currentLocale}/host`;
        break;
    }
    window.location.href = path;
  };

  const toggleLoginMethod = () => {
    setLoginType(loginType === "otp" ? "email" : "otp");
    setShowOtpInput(false);
    setVerificationCode(["", "", "", "", "", ""]);
    setLocalError("");
    clearErrors();
    clearOTPState();
    reset();
  };

  const handleEmailLogin = async (formData) => {
    setLocalError("");

    try {
      const result = await login({
        email: formData.email,
        password: formData.password,
      });
      navigateByRole(result.user?.role);
    } catch (error) {
      // Error is handled by mutation and displayed via error state
    }
  };

  const handleSendOTP = async (formData) => {
    setLocalError("");

    try {
      await sendLoginOTP(formData.phoneNumber);
      setShowOtpInput(true);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = verificationCode.join("");
    if (otpCode.length !== 6) {
      setLocalError(t("loginForm.errors.otpIncomplete"));
      return;
    }

    setLocalError("");

    try {
      const result = await verifyLoginOTP({
        phoneNumber: formValues.phoneNumber,
        otp: otpCode,
      });

      // Check if profile is complete (for admin-created accounts)
      const profileCompleted = result.profileCompleted ?? true;
      if (!profileCompleted) {
        window.location.href = `/${currentLocale}/signup/continue-signup`;
        return;
      }
      navigateByRole(result.user?.role);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleGoBackToPhone = () => {
    setShowOtpInput(false);
    setVerificationCode(["", "", "", "", "", ""]);
    setLocalError("");
    clearOTPState();
  };

  const onSubmit = async (formData) => {
    if (showOtpInput) {
      await handleVerifyOTP();
    } else if (loginType === "email") {
      await handleEmailLogin(formData);
    } else {
      await handleSendOTP(formData);
    }
  };

  const isFormValid = () => {
    if (showOtpInput) {
      return verificationCode.every((digit) => digit !== "") && !isLoading;
    }
    if (loginType === "email") {
      return formValues.email && formValues.password && !isLoading;
    }
    return (
      formValues.phoneNumber && formValues.phoneNumber.length >= 9 && !isLoading
    );
  };

  // Clear auth state on mount (for fresh login)
  useEffect(() => {
    logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <FormProvider {...methods} key={loginType}>
        <form onSubmit={handleSubmit(onSubmit)} key="login-form">
          <div className={styles.form}>
            {!showOtpInput && <Greating />}

            {showOtpInput ? (
              <OtpInput
                verificationCode={{
                  value: verificationCode,
                  error: "",
                  show: true,
                }}
                setVerificationCode={(data) => setVerificationCode(data.value)}
                onGoBack={handleGoBackToPhone}
                phoneNumber={formValues.phoneNumber}
                onResend={() =>
                  resendOTP({ phoneNumber: formValues.phoneNumber, type: "login" })
                }
                isResending={isResendingOTP}
              />
            ) : loginType === "otp" ? (
              <PhoneSection />
            ) : (
              <EmailSection />
            )}

            {error && <div className={styles.error_message}>{error}</div>}

            <ConfirmBtn
              text={
                showOtpInput
                  ? t("loginForm.buttons.verify")
                  : t("loginForm.buttons.login")
              }
              active={isFormValid()}
              type="submit"
              disabled={isLoading}
            />

            {showOtpInput ? (
              <button
                type="button"
                className={styles.edit_phone}
                onClick={handleGoBackToPhone}
              >
                {t("loginForm.otpLogin.editPhone")}
              </button>
            ) : (
              <FormBottom
                text={
                  loginType === "otp"
                    ? t("loginForm.otpLogin.loginWithEmail")
                    : t("loginForm.emailLogin.loginWithOTP")
                }
                clickHandler={toggleLoginMethod}
              />
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default Form;
