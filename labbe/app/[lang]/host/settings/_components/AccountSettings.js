"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import Button from "@/ui/commen/button/Button";
import OtpInput from "@/ui/commen/inputs/optInput/OtpInput";
import { accountSettingsSchema } from "@/utils/schemas/accountSettingsSchema";
import { useUserMutation } from "@/hooks/reactQueryHooks/useUsers";
import { useAuthMutation } from "@/hooks/reactQueryHooks/useAuthMutation";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./AccountSettings.module.css";

const AccountSettings = ({ user = {} }) => {
  const { t } = useTranslation("settings");
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
      username: user.username || "",
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

  const isSaving = updateProfileMutation.isPending || updatePasswordMutation.isPending;
  const isVerifying = sendCodeMutation.isPending || verifyEmailMutation.isPending;

  const onSubmit = async (formData) => {
    try {
      if (formData.password) {
        const res = await updatePasswordMutation.mutateAsync({
          currentPassword: formData.currentPassword,
          newPassword: formData.password,
          passwordConfirm: formData.confirmPassword,
        });
        if (res.status === "success") {
          toastUtils.success(res.message || t("account_updated_successfully"));
        }
      }

      const profileData = { username: formData.username, email: formData.email };
      const response = await updateProfileMutation.mutateAsync(profileData);

      if (response.status === "success") {
        toastUtils.success(response.message || t("account_updated_successfully"));
      }

      reset({
        username: response.data?.user?.username || formData.username,
        email: response.data?.user?.email || formData.email,
        currentPassword: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      toastUtils.error(error.message || t("account_update_failed"));
    }
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
                name="username"
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
              {!showVerificationInput && (
                <Button
                  type="button"
                  variant="secondary"
                  title={isVerifying ? t("sending") : t("verify_email")}
                  className={styles.actionButton}
                  onClick={handleSendVerificationCode}
                  disabled={isVerifying}
                />
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
            onClick={() => {
              reset();
              setShowVerificationInput(false);
              setVerificationCode("");
            }}
          />
        </div>
      </form>
    </FormProvider>
  );
};

export default AccountSettings;
