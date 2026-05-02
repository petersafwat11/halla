import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/ui/commen/button/Button";
import styles from "./reminderPopup.module.css";

const ReminderPopup = ({ numberOfGuests, onConfirm, onCancel }) => {
  const { t } = useTranslation("home-events");
  const [message, setMessage] = useState("");

  const handleConfirm = () => {
    if (!message.trim()) {
      return;
    }
    onConfirm(message);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t("reminderPopup.title")}</h2>

      <div className={styles.guestCount}>
        <span>{t("reminderPopup.guestsToRemind")}: </span>
        <strong>{numberOfGuests}</strong>
      </div>

      <div className={styles.messageContainer}>
        <label htmlFor="reminderMessage" className={styles.label}>
          {t("reminderPopup.messageLabel")}
        </label>
        <textarea
          id="reminderMessage"
          className={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("reminderPopup.messagePlaceholder")}
          rows={5}
        />
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          title={t("common.cancel")}
          onClick={onCancel}
        />
        <Button
          variant="primary"
          title={t("common.confirm")}
          onClick={handleConfirm}
          disabled={!message.trim()}
        />
      </div>
    </div>
  );
};

export default ReminderPopup;
