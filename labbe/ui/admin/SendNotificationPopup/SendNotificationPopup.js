"use client";

import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { MdSend, MdClose, MdNotifications } from "react-icons/md";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import { sendNotificationSchema } from "@/utils/schemas/adminPopupSchemas";
import styles from "./SendNotificationPopup.module.css";

const SendNotificationPopup = ({
  targetUser = null,
  targetRole = null,
  isBulk = false,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation("admin");

  const roleLabel = targetRole
    ? t(`sendNotification.roleLabels.${targetRole}`, {
        defaultValue: t("sendNotification.dialog.usersFallback"),
      })
    : t("sendNotification.dialog.usersFallback");

  const methods = useForm({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: { titleAr: "", titleEn: "", messageAr: "", messageEn: "" },
  });

  const { formState: { isSubmitting } } = methods;

  const onSubmit = async (data) => {
    try {
      const body = {
        title: data.titleEn || data.titleAr,
        titleAr: data.titleAr,
        message: data.messageEn || data.messageAr,
        messageAr: data.messageAr,
      };

      if (isBulk) {
        await apiRequest({
          method: "POST",
          path: API_PATHS.notifications.broadcastNotification,
          data: { ...body, role: targetRole },
        });
      } else {
        await apiRequest({
          method: "POST",
          path: API_PATHS.notifications.sendNotification,
          data: { ...body, userIds: [targetUser._id || targetUser.id], type: "custom" },
        });
      }

      toast.success(isBulk ? t("sendNotification.sentToAll") : t("sendNotification.sentSuccess"));
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(t("sendNotification.sendFailed"));
    }
  };

  return (
    <div className={styles.popup}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <MdNotifications className={styles.headerIcon} />
          <div>
            <h2 className={styles.title}>
              {isBulk
                ? t("sendNotification.dialog.titleBulk", { role: roleLabel })
                : t("sendNotification.dialog.title")}
            </h2>
            {!isBulk && targetUser && (
              <p className={styles.subtitle}>
                {t("sendNotification.dialog.to")} {targetUser.username || targetUser.email || targetUser.phoneNumber}
              </p>
            )}
          </div>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          <MdClose size={24} />
        </button>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
          <InputGroup
            label={t("sendNotification.dialog.titleArLabel")}
            placeholder={t("sendNotification.dialog.titleArPlaceholder")}
            type="text"
            name="titleAr"
            required
          />
          <InputGroup
            label={t("sendNotification.dialog.titleEnLabel")}
            placeholder={t("sendNotification.dialog.titleEnPlaceholder")}
            type="text"
            name="titleEn"
          />
          <TextArea
            label={t("sendNotification.dialog.messageArLabel")}
            placeholder={t("sendNotification.dialog.messageArPlaceholder")}
            name="messageAr"
            required
            rows={4}
          />
          <TextArea
            label={t("sendNotification.dialog.messageEnLabel")}
            placeholder={t("sendNotification.dialog.messageEnPlaceholder")}
            name="messageEn"
            rows={4}
          />

          {isBulk && (
            <div className={styles.warning}>
              <p>{t("sendNotification.dialog.bulkWarning", { role: roleLabel })}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSubmitting}>
              {t("sendNotification.dialog.cancel")}
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className={styles.spinner}></span>
              ) : (
                <>
                  <MdSend size={18} />
                  {t("sendNotification.dialog.send")}
                </>
              )}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default SendNotificationPopup;
