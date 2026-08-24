"use client";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import styles from "./testMessagePopup.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import Button from "@/ui/commen/button/Button";
import { useSendTestMessage } from "@/hooks/messaging";
import { toast } from "react-toastify";
import { saudiPhone } from "@halaa/shared/schemas/_shared";
import { DEFAULT_PHONE_PLACEHOLDER } from "@halaa/shared/utils/phone";

const testMessageSchema = (t) =>
  z.object({
    phoneNumber: saudiPhone(t),
  });

const TestMessagePopup = ({ onConfirm, onCancel, eventId }) => {
  const { t } = useTranslation("home-events");
  const sendTestMessage = useSendTestMessage();

  const methods = useForm({
    resolver: zodResolver(testMessageSchema(t)),
    mode: "onChange",
    defaultValues: {
      phoneNumber: "",
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
  } = methods;

  const onSubmit = async (data) => {
    try {
      await sendTestMessage.mutateAsync({
        eventId,
        phoneNumber: data.phoneNumber,
      });
      toast.success(
        t("testMessage.success") || "Test message sent successfully"
      );
      if (onConfirm) onConfirm(data);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
        t("testMessage.error") ||
        "Failed to send test message"
      );
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.popup}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("testMessage.title")}</h2>
          <p className={styles.description}>{t("testMessage.description")}</p>
        </div>

        <div className={styles.content}>
          <InputGroup
            name="phoneNumber"
            label={t("testMessage.phoneLabel")}
            placeholder={DEFAULT_PHONE_PLACEHOLDER}
            type="tel"
            required
            prefixText="+966"
            error={errors.phoneNumber?.message}
          />
        </div>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            title={t("common.cancel")}
            onClick={onCancel}
            disabled={isSubmitting || sendTestMessage.isPending}
          />
          <Button
            variant="primary"
            title={
              isSubmitting || sendTestMessage.isPending
                ? t("common.sending")
                : t("common.send")
            }
            type="submit"
            disabled={isSubmitting || sendTestMessage.isPending}
          />
        </div>
      </form>
    </FormProvider>
  );
};

export default TestMessagePopup;
