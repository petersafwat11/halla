"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import Button from "@/ui/commen/button/Button";
import OtpInput from "@/ui/commen/inputs/optInput/OtpInput";
import { accountSettingsSchema } from "@halaa/shared/schemas/settings";
import { buildDashboardUrl } from "@halaa/shared/utils/routes";
import { useUserMutation } from "@/hooks/users";
import { useAuthMutation } from "@/hooks/auth";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./AccountSettings.module.css";

const AccountSettings = ({ user = {} }) => {
  const { t } = useTranslation("settings");
  const router = useRouter();
  const { lang } = useParams();
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationInput, setShowVerificationInput] = useState(false);

  const updateProfileMutation = useUserMutation("updateProfile");
  const updatePasswordMutation = useUserMutation("updatePassword");
  const sendCodeMutation = useAuthMutation("sendVerificationCode");
  const verifyEmailMutation = useAuthMutation("verifyEmail");

  const methods = useForm({
    resolver: zodResolver(accountSettingsSchema(t)),
    mode: "onChange",
    defaultValues: {
      // Single display identity. Hosts created before `name` was populated
      // carry their signup full name in `username` — surface it here.
      name: user.name || user.username || "",
      email: user.email || "",
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    handleSubmit,
    formState: { isDirty },
    reset,
  } = methods;

  useEffect(() => {
    reset({
      name: user.name || user.username || "",
      email: user.email || "",
      currentPassword: "",
      password: "",
      confirmPassword: "",
    });
  }, [user.name, user.username, user.email, reset]);

  const isSaving = updateProfileMutation.isPending || updatePasswordMutation.isPending;
  const isVerifying = sendCodeMutation.isPending || verifyEmailMutation.isPending;

  const onSubmit = async (formData) => {
    const profileChanged =
      formData.name !== (user.name || user.username || "") ||
      formData.email !== (user.email || "");
    const passwordProvided = !!formData.password;

    let passwordSuccess = false;
    let profileSuccess = false;
    let passwordError = null;
    let profileError = null;

    if (passwordProvided) {
      try {
        await updatePasswordMutation.mutateAsync({
          currentPassword: formData.currentPassword,
          newPassword: formData.password,
          passwordConfirm: formData.confirmPassword,
        });
        passwordSuccess = true;
      } catch (err) {
        passwordError = err;
      }
    }

    let response = null;
    if (profileChanged) {
      try {
        const profileData = {
          name: formData.name,
          email: formData.email,
        };
        response = await updateProfileMutation.mutateAsync(profileData);
        profileSuccess = true;
      } catch (err) {
        profileError = err;
      }
    }

    if (passwordSuccess && profileSuccess) {
      toastUtils.success(t("account_updated_successfully"));
    } else if (passwordSuccess && !profileError) {
      toastUtils.success(t("password_updated_successfully", "تم تحديث كلمة المرور بنجاح"));
    } else if (profileSuccess && !passwordError) {
      toastUtils.success(t("profile_updated_successfully", "تم تحديث البيانات بنجاح"));
    } else if (passwordSuccess && profileError) {
      toastUtils.warning(
        `${t("password_updated_successfully", "تم تحديث كلمة المرور بنجاح")}، ${t("profile_update_failed", "ولكن فشل تحديث البيانات")}: ${profileError.message || ""}`
      );
    } else if (profileSuccess && passwordError) {
      toastUtils.warning(
        `${t("profile_updated_successfully", "تم تحديث البيانات بنجاح")}، ${t("password_update_failed", "ولكن فشل تحديث كلمة المرور")}: ${passwordError.message || ""}`
      );
    } else if (passwordError || profileError) {
      const err = passwordError || profileError;
      toastUtils.error(err.message || t("account_update_failed"));
    }

    reset({
      name: profileSuccess
        ? response?.data?.user?.name || formData.name
        : formData.name,
      email: profileSuccess
        ? response?.data?.user?.email || formData.email
        : formData.email,
      currentPassword: passwordSuccess ? "" : formData.currentPassword,
      password: passwordSuccess ? "" : formData.password,
      confirmPassword: passwordSuccess ? "" : formData.confirmPassword,
    });
  };

  const handleSendVerificationCode = async () => {
    try {
      const response = await sendCodeMutation.mutateAsync();
      if (response.status === "success") {
        toastUtils.success(response.message || t("verification_code_sent"));
        setShowVerificationInput(true);
      }
    } catch (error) {
      toastUtils.error(error.message || t("verification_code_send_failed"));
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toastUtils.error(t("enter_valid_verification_code"));
      return;
    }
    try {
      const response = await verifyEmailMutation.mutateAsync(verificationCode);
      if (response.status === "success") {
        toastUtils.success(response.message || t("email_verified_successfully"));
        setShowVerificationInput(false);
        setVerificationCode("");
      }
    } catch (error) {
      toastUtils.error(error.message || t("email_verification_failed"));
    }
  };

  return (
    <FormProvider {...methods}>
      <form className={styles.container} onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.inputsContainer}>
          <div className={styles.nameAndEmailRow}>
            <div className={styles.inputRow}>
              <InputGroup
                name="name"
                label={t("full_name")}
                placeholder={t("full_name_placeholder")}
                type="text"
                iconPath="auth/profile.svg"
                required
              />
            </div>

            <div className={styles.inputRow}>
              <InputGroup
                name="email"
                label={t("email_address")}
                placeholder={t("email_placeholder")}
                type="email"
                iconPath="auth/email.svg"
                required
              />
              {!user.emailVerified && !showVerificationInput && (
                <Button
                  type="button"
                  variant="secondary"
                  title={isVerifying ? t("sending") : t("verify_email")}
                  className={styles.actionButton}
                  onClick={handleSendVerificationCode}
                  disabled={isVerifying}
                />
              )}
              {user.emailVerified && (
                <span className={styles.verifiedBadge} role="status">
                  {t("email_verified")}
                </span>
              )}
            </div>

            {showVerificationInput && (
              <div className={styles.verificationRow}>
                <OtpInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                />
                <Button
                  type="button"
                  variant="primary"
                  title={isVerifying ? t("verifying") : t("verify_code")}
                  onClick={handleVerifyCode}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className={styles.actionButton}
                />
              </div>
            )}
          </div>

          <div className={styles.passwordSection}>
            <h3 className={styles.sectionTitle}>{t("change_password")}</h3>
            <p className={styles.sectionDescription}>
              {t("change_password_description")}
            </p>

            <div className={styles.passwordInputs}>
              <InputGroup
                name="currentPassword"
                label={t("current_password")}
                placeholder={t("current_password_placeholder")}
                type="password"
                iconPath="auth/password.svg"
              />

              <InputGroup
                name="password"
                label={t("new_password")}
                placeholder={t("new_password_placeholder")}
                type="password"
                iconPath="auth/password.svg"
              />

              <InputGroup
                name="confirmPassword"
                label={t("confirm_password")}
                placeholder={t("confirm_password_placeholder")}
                type="password"
                iconPath="auth/password.svg"
              />
            </div>
          </div>
        </div>

        <div className={styles.buttonsContainer}>
          <Button
            type="submit"
            variant="primary"
            title={isSaving ? t("saving") : t("save_changes")}
            disabled={!isDirty || isSaving}
            className={styles.saveButton}
          />
          <Button
            type="button"
            variant="outline"
            title={t("cancel")}
            className={styles.cancelButton}
            onClick={() =>
              router.push(buildDashboardUrl({ role: user?.role || "host", locale: lang }))
            }
          />
        </div>
      </form>
    </FormProvider>
  );
};

export default AccountSettings;
