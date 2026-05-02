"use client";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import Button from "@/ui/commen/button/Button";
import { notificationsSchema } from "@/utils/schemas/settingsSchemas";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./notifictions.module.css";

const Notifications = ({ initialData }) => {
  const { t } = useTranslation("settings");
  const [isLoading, setIsLoading] = useState(false);

  // Default values
  const defaultValues = {
    appNotifications: {
      eventUpdates: true,
      eventDates: true,
      packageRenewal: true,
      systemInteractions: true,
    },
    emailNotifications: {
      eventUpdates: false,
      eventDates: false,
      packageRenewal: false,
      beforeSendingInvitations: false,
      afterSendingInvitations: false,
    },
  };
  // Initialize React Hook Form
  const methods = useForm({
    resolver: zodResolver(notificationsSchema(t)),
    mode: "onChange",
    defaultValues: initialData || defaultValues,
  });

  const {
    handleSubmit,
    formState: { isDirty },
    reset,
  } = methods;

  const onSubmit = async (formData) => {
    setIsLoading(true);

    try {
      const response =
        await hostAPI.notifications.updateNotificationPreferences(formData);

      if (response.status === "success") {
        toastUtils.success(response.message || t("success_message"));
        console.log("Update response:", response);
      }
    } catch (error) {
      console.error("Error updating notification settings:", error);
      toastUtils.error(error.message || t("error_message"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* App Notifications Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>{t("app_notifications")}</h3>
              <p className={styles.sectionDescription}>
                {t("app_notifications_description")}
              </p>
            </div>

            <div className={styles.togglesGroup}>
              <ToggleInput
                name="appNotifications.eventUpdates"
                label={t("event_updates")}
              />
              <ToggleInput
                name="appNotifications.eventDates"
                label={t("event_dates")}
              />
              <ToggleInput
                name="appNotifications.packageRenewal"
                label={t("package_renewal")}
              />
              <ToggleInput
                name="appNotifications.systemInteractions"
                label={t("system_interactions")}
              />
            </div>
          </div>

          {/* Email Notifications Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                {t("email_notifications")}
              </h3>
              <p className={styles.sectionDescription}>
                {t("email_notifications_description")}
              </p>
            </div>

            <div className={styles.togglesGroup}>
              <ToggleInput
                name="emailNotifications.eventUpdates"
                label={t("event_updates")}
              />
              <ToggleInput
                name="emailNotifications.eventDates"
                label={t("event_dates")}
              />
              <ToggleInput
                name="emailNotifications.packageRenewal"
                label={t("package_renewal")}
              />
              <ToggleInput
                name="emailNotifications.beforeSendingInvitations"
                label={t("before_sending_invitations")}
              />
              <ToggleInput
                name="emailNotifications.afterSendingInvitations"
                label={t("after_sending_invitations")}
              />
            </div>
          </div>

          <div className={styles.buttonContainer}>
            <Button
              type="button"
              variant="outline"
              title={t("cancel")}
              onClick={() => {
                reset(initialData);
              }}
            />

            <Button
              type="submit"
              variant="primary"
              title={isLoading ? t("saving") : t("save_changes")}
              disabled={!isDirty || isLoading}
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default Notifications;
