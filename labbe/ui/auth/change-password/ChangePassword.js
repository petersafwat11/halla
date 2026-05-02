"use client";
import React, { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./changePassword.module.css";
import FormHeader from "../../commen/formHeader/FormHeader";
import InputGroup from "../../commen/inputs/inputGroup/InputGroup";
import ConfirmBtn from "../../commen/confirmButton/ConfirmBtn";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useAuthMutation } from "@/hooks/reactQueryHooks/useAuthMutation";
import useLanguageChange from "@/hooks/UseLanguageChange";

const ChangePassword = () => {
  const { currentLocale } = useLanguageChange();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation("changePassword");

  // Auth mutation hook
  const {
    mutate: resetPassword,
    isPending: isLoading,
    error: mutationError,
    isSuccess,
  } = useAuthMutation("resetPassword");

  const {
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setError,
  } = useFormContext();

  const [passwordChanged, setPasswordChanged] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [token, setToken] = useState("");

  const password = watch("password");
  const passwordConfirm = watch("passwordConfirm");

  // Extract token from URL on component mount
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (!tokenFromUrl) {
      setTokenError(t("changePasswordForm.errors.invalidToken"));
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams, t]);

  // Password validation rules for display
  const passwordValidations = [
    {
      text: t("changePasswordForm.errors.passwordMinLength"),
      isValid: password ? password.length >= 8 : false,
    },
    {
      text: t("changePasswordForm.errors.passwordComplexity"),
      isValid: password
        ? /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
        : false,
    },
  ];

  const onSubmit = async (data) => {
    if (!token) {
      setTokenError(t("changePasswordForm.errors.invalidToken"));
      return;
    }

    setTokenError("");

    try {
      await resetPassword({
        token,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
      });
      setPasswordChanged(true);
    } catch (error) {
      const errorMessage = error.message || t("changePasswordForm.errors.generic");
      // Check if it's a token-related error
      if (
        errorMessage.toLowerCase().includes("token") ||
        errorMessage.toLowerCase().includes("expired") ||
        errorMessage.toLowerCase().includes("invalid")
      ) {
        setTokenError(errorMessage);
      } else {
        setError("password", { message: errorMessage });
      }
    }
  };

  const handleGoToLogin = () => {
    router.push(`/${currentLocale}/login`);
  };

  // Show error if no token
  if (tokenError && !token) {
    return (
      <div className={styles.container}>
        <div className={styles.form_header}>
          <FormHeader />
        </div>
        <div className={styles.form}>
          <div className={styles.image_container}>
            <Image
              className={styles.icon}
              src={"/svg/auth/forget-password.svg"}
              alt="error"
              width={80}
              height={105}
            />
          </div>
          <div className={styles.text_container}>
            <h2 className={styles.title}>
              {t("changePasswordForm.errors.tokenExpired")}
            </h2>
            <p className={styles.description}>
              {t("changePasswordForm.errors.tokenExpiredDescription")}
            </p>
          </div>
          <ConfirmBtn
            text={t("changePasswordForm.buttons.backToLogin")}
            active={true}
            clickHandler={handleGoToLogin}
          />
        </div>
      </div>
    );
  }

  // Show success message after password change
  if (passwordChanged) {
    return (
      <div className={styles.container}>
        <div className={styles.form_header}>
          <FormHeader />
        </div>
        <div className={styles.email_sent_message}>
          <div className={styles.image_container}>
            <Image
              className={styles.icon}
              src={"/svg/auth/true.svg"}
              alt="password-changed"
              width={115}
              height={116}
            />
          </div>
          <div className={styles.text_container}>
            <h2 className={styles.title}>
              {t("changePasswordForm.success.title")}
            </h2>
            <p className={styles.description}>
              {t("changePasswordForm.success.description")}
            </p>
          </div>
          <ConfirmBtn
            text={t("changePasswordForm.buttons.login")}
            active={true}
            clickHandler={handleGoToLogin}
          />
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className={styles.container}>
      <div className={styles.form_header}>
        <FormHeader />
      </div>
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.image_container}>
          <Image
            className={styles.icon}
            src={"/svg/auth/forget-password.svg"}
            alt="change-password"
            width={80}
            height={105}
          />
        </div>
        <div className={styles.text_container}>
          <h2 className={styles.title}>{t("changePasswordForm.title")}</h2>
          <p className={styles.description}>
            {t("changePasswordForm.subtitle")}
          </p>
        </div>

        {tokenError && (
          <div className={styles.error_container}>
            <p className={styles.error}>{tokenError}</p>
          </div>
        )}

        <div className={styles.inputs_container}>
          <InputGroup
            label={t("changePasswordForm.newPassword.label")}
            type="password"
            placeholder={t("changePasswordForm.newPassword.placeholder")}
            required
            name="password"
            iconPath="auth/password.svg"
            validations={passwordValidations}
          />

          <InputGroup
            label={t("changePasswordForm.confirmPassword.label")}
            type="password"
            placeholder={t("changePasswordForm.confirmPassword.placeholder")}
            required
            name="passwordConfirm"
            iconPath="auth/password.svg"
          />
        </div>

        <ConfirmBtn
          text={
            isLoading
              ? t("changePasswordForm.buttons.updating")
              : t("changePasswordForm.buttons.confirm")
          }
          active={
            isValid &&
            password &&
            passwordConfirm &&
            !isLoading &&
            !tokenError
          }
          clickHandler={handleSubmit(onSubmit)}
        />
      </form>
    </div>
  );
};

export default ChangePassword;
