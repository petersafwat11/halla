/**
 * Unified Notification Preferences Component
 * Works for all roles: host, vendor, admin
 */

"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import Button from "@/ui/commen/button/Button";
import {
  getNotificationSchemaForRole,
  getNotificationDefaultsForRole,
  getNotificationOptionsForRole,
  USER_ROLES,
} from "@/utils/schemas/notificationPreferencesSchemas";
import { useUserMutation } from "@/hooks/users";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./NotificationPreferences.module.css";

/**
 * NotificationPreferences Component
 * @param {Object} props
 * @param {Object} props.initialData - Initial notification preferences data
 * @param {string} props.userRole - User role (host, vendor, admin, etc.)
 * @param {boolean} props.emailVerified - Whether user's email is verified
 * @param {Function} props.onSave - Optional callback after successful save
 */
const NotificationPreferences = ({
  initialData,
  userRole = USER_ROLES.HOST,
  emailVerified = false,
  onSave,
}) => {
  const { t } = useTranslation("settings");
  const updateNotifMutation = useUserMutation("updateNotificationPreferences");
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const isLoading = updateNotifMutation.isPending;

  // Get role-specific schema and defaults
  const schema = getNotificationSchemaForRole(userRole);
  const defaults = getNotificationDefaultsForRole(userRole);
  const options = getNotificationOptionsForRole(userRole, t);

  // Server prefs are sparse for accounts that never saved before — a missing
  // key means "deliver" on the backend. Merge them over the role defaults so
  // the toggles reflect the true delivery state instead of rendering OFF.
  const mergePrefs = (server = {}) => {
    const merged = {
      appNotifications: {
        ...(defaults.appNotifications || {}),
        ...(server.appNotifications || {}),
      },
    };
    if (defaults.emailNotifications) {
      merged.emailNotifications = {
        ...defaults.emailNotifications,
        ...(server.emailNotifications || {}),
      };
    }
    return merged;
  };
  const initialValues = mergePrefs(initialData);

  // Initialize React Hook Form
  const methods = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: initialValues,
  });

  const {
    handleSubmit,
    formState: { isDirty },
    reset,
  } = methods;

  const hasEmailOptions = (options.emailNotifications || []).length > 0;

  const onSubmit = async (formData) => {
    // Check if trying to enable email notifications without verified email
    if (hasEmailOptions && !emailVerified) {
      const hasEnabledEmailNotif = Object.values(
        formData.emailNotifications || {}
      ).some((v) => v === true);
      if (hasEnabledEmailNotif) {
        setShowEmailWarning(true);
        toastUtils.error(
          t(
            "notifications.emailNotVerified",
            "يجب التحقق من بريدك الإلكتروني قبل تفعيل إشعارات البريد"
          )
        );
        return;
      }
    }

    try {
      const response = await updateNotifMutation.mutateAsync(formData);

      if (response.status === "success") {
        toastUtils.success(
          response.message ||
            t("notifications.saveSuccess", "تم حفظ الإعدادات بنجاح")
        );
        reset(formData);
        onSave?.(formData);
      }
    } catch (error) {
      toastUtils.error(
        error.message || t("notifications.saveError", "فشل في حفظ الإعدادات")
      );
    }
  };

  const handleReset = () => {
    reset(initialValues);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.container}>
        {/* App Notifications Section */}
        <div className={styles.sections}>
          <div className={styles.section}>
            <div className={styles.sectionContent}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  {t("notifications.appNotifications", "إشعارات التطبيق")}
                </h3>
                <p className={styles.sectionDescription}>
                  {t(
                    "notifications.appNotificationsDesc",
                    "تحكم في الإشعارات التي تظهر داخل التطبيق"
                  )}
                </p>
              </div>

              <div className={styles.togglesContainer}>
                {options.appNotifications.map((option) => (
                  <ToggleInput
                    key={option.key}
                    name={`appNotifications.${option.key}`}
                    label={option.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Email Notifications Section — only rendered for roles that
              still expose email preferences. Host has no email prefs:
              plan/payment emails always fire, all other host emails are
              gone. */}
          {hasEmailOptions && (
            <div className={styles.section}>
              <div className={styles.sectionContent}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    {t(
                      "notifications.emailNotifications",
                      "إشعارات البريد الإلكتروني"
                    )}
                  </h3>
                  <p className={styles.sectionDescription}>
                    {t(
                      "notifications.emailNotificationsDesc",
                      "تحكم في الإشعارات التي ترسل إلى بريدك الإلكتروني"
                    )}
                  </p>
                </div>

                {!emailVerified && (
                  <div className={styles.emailWarning}>
                    <span className={styles.warningIcon}>⚠️</span>
                    <p className={styles.warningText}>
                      {t(
                        "notifications.emailNotVerifiedWarning",
                        "يجب التحقق من بريدك الإلكتروني لتفعيل إشعارات البريد. يرجى التحقق من بريدك في إعدادات الحساب."
                      )}
                    </p>
                  </div>
                )}

                <div
                  className={`${styles.togglesContainer} ${
                    !emailVerified ? styles.disabled : ""
                  }`}
                >
                  {options.emailNotifications.map((option) => (
                    <ToggleInput
                      key={option.key}
                      name={`emailNotifications.${option.key}`}
                      label={option.label}
                      disabled={!emailVerified}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.buttonsContainer}>
          <Button
            type="submit"
            variant="primary"
            title={
              isLoading
                ? t("notifications.saving", "جاري الحفظ...")
                : t("notifications.save", "حفظ التغييرات")
            }
            disabled={!isDirty || isLoading}
            className={styles.saveButton}
          />
          <Button
            type="button"
            variant="outline"
            title={t("notifications.cancel", "إلغاء")}
            className={styles.cancelButton}
            onClick={handleReset}
            disabled={!isDirty || isLoading}
          />
        </div>
      </form>
    </FormProvider>
  );
};

export default NotificationPreferences;
