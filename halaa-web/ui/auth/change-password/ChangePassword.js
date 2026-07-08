"use client";
import React, { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./changePassword.module.css";
import InputGroup from "../../commen/inputs/inputGroup/InputGroup";
import ConfirmBtn from "../../commen/confirmButton/ConfirmBtn";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useAuthMutation } from "@/hooks/auth";
import { useUserMutation } from "@/hooks/users";
import useAuthStore from "@/stores/authStore";
import useLanguageChange from "@/hooks/UseLanguageChange";
import { getAuthErrorMessage } from "@/services/errorHandlingService";

const ChangePassword = () => {
  const { currentLocale } = useLanguageChange();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation("changePassword");
  const { t: tCommon } = useTranslation("common");

  // Authenticated "must change password" flow (business accounts provisioned by
  // an admin): the user is logged in with no reset token, so we rotate the
  // password via the authenticated endpoint instead of the token reset.
  const user = useAuthStore((state) => state.user);
  const mustChangePassword = user?.mustChangePassword === true;

  // Auth mutation hook (token-based reset — forgot-password flow)
  const {
    mutate: resetPassword,
    isPending: isResetting,
    error: mutationError,
    isSuccess,
  } = useAuthMutation("resetPassword");

  // Authenticated password update (must-change-password flow)
  const { mutateAsync: updatePassword, isPending: isUpdating } =
    useUserMutation("updatePassword");

  const isLoading = isResetting || isUpdating;

  const {
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setError,
  } = useFormContext();

  const [passwordChanged, setPasswordChanged] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [token, setToken] = useState("");
  // Current (temporary) password — only used in the authenticated
  // must-change-password flow, where the backend requires it.
  const [currentPassword, setCurrentPassword] = useState("");

  const password = watch("password");
  const passwordConfirm = watch("passwordConfirm");

  // Extract token from URL on component mount. In the authenticated
  // must-change-password flow there is no token — that is expected, so we skip
  // the invalid-token error in that case.
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else if (!mustChangePassword) {
      setTokenError(t("changePasswordForm.errors.invalidToken"));
    }
  }, [searchParams, t, mustChangePassword]);

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
    setTokenError("");

    // Authenticated must-change-password flow: rotate via the authenticated
    // endpoint, then send the user to their dashboard.
    if (mustChangePassword) {
      if (!currentPassword) {
        setError("password", {
          message: t("changePasswordForm.currentPassword.required", {
            defaultValue: tCommon("authErrors.currentPasswordRequired", {
              defaultValue: "Current password is required",
            }),
          }),
        });
        return;
      }
      try {
        await updatePassword({
          currentPassword,
          newPassword: data.password,
          passwordConfirm: data.passwordConfirm,
        });
        setPasswordChanged(true);
        router.replace(`/${currentLocale}/host`);
      } catch (error) {
        const resolved = getAuthErrorMessage(error.parsedError || null, tCommon);
        const errorMessage =
          resolved?.message ||
          error.message ||
          t("changePasswordForm.errors.generic");
        setError("password", { message: errorMessage });
      }
      return;
    }

    if (!token) {
      setTokenError(t("changePasswordForm.errors.invalidToken"));
      return;
    }

    try {
      await resetPassword({
        token,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
      });
      setPasswordChanged(true);
    } catch (error) {
      const resolved = getAuthErrorMessage(error.parsedError || null, tCommon);
      const errorMessage = resolved?.message || error.message || t("changePasswordForm.errors.generic");
      // Stable code wins over substring sniffing — token expiry now uses
      // TOKEN_INVALID_OR_EXPIRED from the backend (see auth.service.js
      // resetPassword) so we route to the dedicated tokenError view + offer
      // a "request new link" action instead of stuffing the message into
      // the password field.
      const isTokenError =
        resolved?.code === "TOKEN_INVALID_OR_EXPIRED" ||
        resolved?.actionLink === "requestNewLink";
      if (isTokenError) {
        setTokenError(errorMessage);
      } else {
        setError("password", { message: errorMessage });
      }
    }
  };

  const handleGoToLogin = () => {
    router.push(`/${currentLocale}/login`);
  };

  const handleRequestNewLink = () => {
    router.push(`/${currentLocale}/forget-password`);
  };

  // Show error if no token OR token expired/invalid after submit.
  if (tokenError) {
    return (
      <div className={styles.container}>
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
            <p className={styles.description}>{tokenError}</p>
          </div>
          <ConfirmBtn
            text={tCommon("authErrors.requestNewLinkAction")}
            active={true}
            clickHandler={handleRequestNewLink}
          />
          <button
            type="button"
            className={styles.edit_phone}
            onClick={handleGoToLogin}
            style={{ marginTop: "1rem", background: "none", border: "none", cursor: "pointer" }}
          >
            {t("changePasswordForm.buttons.backToLogin")}
          </button>
        </div>
      </div>
    );
  }

  // Show success message after password change
  if (passwordChanged) {
    return (
      <div className={styles.container}>
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
          {mustChangePassword && (
            <InputGroup
              label={t("changePasswordForm.currentPassword.label", {
                defaultValue: "Current password",
              })}
              type="password"
              placeholder={t("changePasswordForm.currentPassword.placeholder", {
                defaultValue: "Enter your current password",
              })}
              required
              name="currentPassword"
              iconPath="auth/password.svg"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          )}
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
