"use client";
import React, { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import styles from "./forgetPassword.module.css";
import Image from "next/image";
import InputGroup from "../../commen/inputs/inputGroup/InputGroup";
import ConfirmBtn from "../../commen/confirmButton/ConfirmBtn";
import { useTranslation } from "react-i18next";
import { useAuthMutation } from "@/hooks/auth";
import { getAuthErrorMessage } from "@/services/errorHandlingService";

const ForgetPassword = () => {
  const { t } = useTranslation("forgetPassword");
  const { t: tCommon } = useTranslation("common");
  const {
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setError,
  } = useFormContext();

  // Auth mutation hook
  const {
    mutate: forgotPassword,
    isPending: isLoading,
    error: mutationError,
    isSuccess,
  } = useAuthMutation("forgotPassword");

  const [showEmailSentMessage, setShowEmailSentMessage] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(90);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [sentEmail, setSentEmail] = useState("");

  const email = watch("email");

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (showEmailSentMessage && isResendDisabled && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showEmailSentMessage, isResendDisabled, resendCountdown]);

  // Sync with mutation success state
  useEffect(() => {
    if (isSuccess && !showEmailSentMessage) {
      setShowEmailSentMessage(true);
    }
  }, [isSuccess]);

  const onSubmit = async (data) => {
    setSentEmail(data.email);

    try {
      await forgotPassword(data.email);
      setShowEmailSentMessage(true);
      setResendCountdown(90);
      setIsResendDisabled(true);
    } catch (error) {
      const resolved = getAuthErrorMessage(error.parsedError || null, tCommon);
      setError("email", {
        message: resolved?.message || error.message || t("forgetPasswordForm.errors.generic"),
      });
    }
  };

  const handleResendLink = async () => {
    try {
      await forgotPassword(sentEmail);
      setResendCountdown(90);
      setIsResendDisabled(true);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleGoToEmail = () => {
    window.open("mailto:", "_blank");
  };

  return (
    <div className={styles.container}>
      {!showEmailSentMessage ? (
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.image_container}>
            <Image
              className={styles.icon}
              src={"/svg/auth/forget-password.svg"}
              alt="forget-password"
              width={80}
              height={105}
            />
          </div>
          <div className={styles.text_container}>
            <h2 className={styles.title}>{t("forgetPasswordForm.title")}</h2>
            <p className={styles.description}>
              {t("forgetPasswordForm.description")}
            </p>
          </div>
          <InputGroup
            label={t("forgetPasswordForm.email.label")}
            type="email"
            placeholder={t("forgetPasswordForm.email.placeholder")}
            required
            name="email"
            iconPath="auth/email.svg"
          />
          <ConfirmBtn
            text={
              isLoading
                ? t("forgetPasswordForm.buttons.sending")
                : t("forgetPasswordForm.buttons.confirm")
            }
            active={isValid && email?.trim() && !isLoading}
            clickHandler={handleSubmit(onSubmit)}
          />
        </form>
      ) : (
        <div className={styles.email_sent_message}>
          <div className={styles.image_container}>
            <Image
              className={styles.icon}
              src={"/svg/auth/send-email.svg"}
              alt="email-sent"
              width={120}
              height={120}
            />
          </div>
          <div className={styles.text_container}>
            <h2 className={styles.title}>
              {t("forgetPasswordForm.emailSent.title")}
            </h2>
            <p className={styles.description}>
              {t("forgetPasswordForm.emailSent.description", {
                email: sentEmail,
              })}
            </p>
          </div>
          <ConfirmBtn
            text={t("forgetPasswordForm.buttons.goToEmail")}
            active={true}
            clickHandler={handleGoToEmail}
          />
          <button
            className={styles.resend_link}
            onClick={handleResendLink}
            disabled={isLoading || isResendDisabled}
            type="button"
          >
            {isLoading
              ? t("forgetPasswordForm.buttons.sending")
              : isResendDisabled
                ? t("forgetPasswordForm.buttons.resendCountdown", {
                  count: resendCountdown,
                })
                : t("forgetPasswordForm.buttons.resendLink")}
          </button>
        </div>
      )}
    </div>
  );
};

export default ForgetPassword;
