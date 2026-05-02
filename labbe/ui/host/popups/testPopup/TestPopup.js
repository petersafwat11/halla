import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./testPopup.module.css";
import MobileInputGroup from "@/ui/commen/inputs/mobileInputGroup/MobileInputGroup";
import Button from "@/ui/commen/button/Button";
import { toast } from "react-toastify";
import { useForm, FormProvider } from "react-hook-form";

const TestPopup = ({ onClose }) => {
  const { t } = useTranslation("common");
  const methods = useForm({
    defaultValues: {
      phoneNumber: "",
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(
        t("test_message_sent") || "Test message sent successfully!"
      );
      onClose();
    } catch (error) {
      toast.error(t("test_message_failed") || "Failed to send test message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className={styles.popup}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("test_sending") || "Test Sending"}</h2>
        <button className={styles.closeButton} onClick={onClose}>
          <img src="/svg/events/close.svg" alt="close" />
        </button>
      </div>

      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className={styles.content}
        >
          <p className={styles.description}>
            {t("test_sending_description") ||
              "Enter a phone number to test the sending functionality"}
          </p>

          <div className={styles.inputContainer}>
            <MobileInputGroup
              label={t("phone_number") || "Phone Number"}
              placeholder={t("enter_phone_number") || "Enter phone number"}
              type="tel"
              name="phoneNumber"
              required
            />
          </div>

          <div className={styles.actions}>
            <Button
              variant="outline"
              title={t("cancel") || "Cancel"}
              onClick={handleCancel}
              type="button"
              disabled={isLoading}
            />
            <Button
              variant="primary"
              title={
                isLoading
                  ? t("sending") || "Sending..."
                  : t("confirm") || "Confirm"
              }
              type="submit"
              disabled={isLoading}
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default TestPopup;
