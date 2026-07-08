"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/ui/commen/button/Button";
import styles from "./sendInvitationPopup.module.css";

const SendInvitationPopup = ({
  selectedCount = 0,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation("home-events");
  const [channel, setChannel] = useState("sms");

  const handleConfirm = () => {
    onConfirm(channel);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        {t("messaging.sendInvitation", "إرسال الدعوات")}
      </h2>

      <div className={styles.guestCount}>
        <span>{t("messaging.selectedGuests", "الضيوف المحددين")}: </span>
        <strong>{selectedCount}</strong>
      </div>

      <div className={styles.channelSection}>
        <label className={styles.label}>
          {t("messaging.selectChannel", "اختر طريقة الإرسال")}
        </label>

        <div className={styles.channelOptions}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="channel"
              value="sms"
              checked={channel === "sms"}
              onChange={(e) => setChannel(e.target.value)}
            />
            <span className={styles.radioLabel}>
              <span className={styles.channelIcon}>📱</span>
              {t("messaging.sms", "رسالة نصية SMS")}
            </span>
          </label>

          <label className={styles.radioOption}>
            <input
              type="radio"
              name="channel"
              value="whatsapp"
              checked={channel === "whatsapp"}
              onChange={(e) => setChannel(e.target.value)}
            />
            <span className={styles.radioLabel}>
              <span className={styles.channelIcon}>💬</span>
              {t("messaging.whatsapp", "واتساب")}
            </span>
          </label>
        </div>
      </div>

      <div className={styles.info}>
        <p>
          {channel === "sms"
            ? t(
                "messaging.smsInfo",
                "سيتم إرسال رسالة نصية تحتوي على تفاصيل الدعوة ورابط للرد"
              )
            : t(
                "messaging.whatsappInfo",
                "سيتم إرسال رسالة واتساب تحتوي على تفاصيل الدعوة ورابط للرد"
              )}
        </p>
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          title={t("common.cancel", "إلغاء")}
          onClick={onCancel}
          disabled={isLoading}
        />
        <Button
          variant="primary"
          title={
            isLoading
              ? t("messaging.sending", "جاري الإرسال...")
              : t("messaging.send", "إرسال")
          }
          onClick={handleConfirm}
          disabled={selectedCount === 0 || isLoading}
        />
      </div>
    </div>
  );
};

export default SendInvitationPopup;
