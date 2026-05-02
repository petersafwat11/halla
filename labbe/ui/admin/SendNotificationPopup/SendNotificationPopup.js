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
  const { t, i18n } = useTranslation("adminCommon");
  const isRTL = i18n.language === "ar";

  const roleLabels = {
    host: isRTL ? "المضيفين" : "Hosts",
    vendor: isRTL ? "مزودي الخدمات" : "Vendors",
    moderator: isRTL ? "المشرفين" : "Moderators",
    whitelabel_admin: isRTL ? "مديري الوايت ليبل" : "Whitelabel Admins",
    admin: isRTL ? "المديرين" : "Admins",
  };

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

      toast.success(
        isRTL
          ? isBulk ? "تم إرسال الإشعار لجميع المستخدمين" : "تم إرسال الإشعار بنجاح"
          : isBulk ? "Notification sent to all users" : "Notification sent successfully"
      );
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(isRTL ? "فشل في إرسال الإشعار" : "Failed to send notification");
    }
  };

  return (
    <div className={styles.popup} dir={isRTL ? "rtl" : "ltr"}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <MdNotifications className={styles.headerIcon} />
          <div>
            <h2 className={styles.title}>
              {isBulk
                ? isRTL
                  ? `إرسال إشعار لجميع ${roleLabels[targetRole] || "المستخدمين"}`
                  : `Send Notification to All ${roleLabels[targetRole] || "Users"}`
                : isRTL ? "إرسال إشعار" : "Send Notification"}
            </h2>
            {!isBulk && targetUser && (
              <p className={styles.subtitle}>
                {isRTL ? "إلى:" : "To:"} {targetUser.username || targetUser.email || targetUser.phoneNumber}
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
            label={isRTL ? "العنوان (عربي) *" : "Title (Arabic) *"}
            placeholder={isRTL ? "عنوان الإشعار بالعربية" : "Notification title in Arabic"}
            type="text"
            name="titleAr"
            required
          />
          <InputGroup
            label={isRTL ? "العنوان (إنجليزي)" : "Title (English)"}
            placeholder={isRTL ? "عنوان الإشعار بالإنجليزية (اختياري)" : "Notification title in English (optional)"}
            type="text"
            name="titleEn"
          />
          <TextArea
            label={isRTL ? "الرسالة (عربي) *" : "Message (Arabic) *"}
            placeholder={isRTL ? "محتوى الإشعار بالعربية" : "Notification content in Arabic"}
            name="messageAr"
            required
            rows={4}
          />
          <TextArea
            label={isRTL ? "الرسالة (إنجليزي)" : "Message (English)"}
            placeholder={isRTL ? "محتوى الإشعار بالإنجليزية (اختياري)" : "Notification content in English (optional)"}
            name="messageEn"
            rows={4}
          />

          {isBulk && (
            <div className={styles.warning}>
              <p>
                {isRTL
                  ? `⚠️ سيتم إرسال هذا الإشعار لجميع ${roleLabels[targetRole] || "المستخدمين"}`
                  : `⚠️ This notification will be sent to all ${roleLabels[targetRole] || "users"}`}
              </p>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSubmitting}>
              {isRTL ? "إلغاء" : "Cancel"}
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className={styles.spinner}></span>
              ) : (
                <>
                  <MdSend size={18} />
                  {isRTL ? "إرسال" : "Send"}
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
