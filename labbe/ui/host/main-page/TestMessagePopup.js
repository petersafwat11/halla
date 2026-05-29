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

const testMessageSchema = (t) =>
  z.object({
    phoneNumber: z
      .string()
      .min(1, t("testMessage.validation.phoneRequired"))
      .regex(/^5[0-9]{8}$/, t("testMessage.validation.phoneFormat")),
    channel: z.enum(["whatsapp", "sms"]).default("whatsapp"),
  });

const TestMessagePopup = ({ onConfirm, onCancel, eventId }) => {
  const { t } = useTranslation("home-events");
  const sendTestMessage = useSendTestMessage();

  const methods = useForm({
    resolver: zodResolver(testMessageSchema(t)),
    mode: "onChange",
    defaultValues: {
      phoneNumber: "",
      channel: "whatsapp",
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = methods;

  const channel = watch("channel");

  const onSubmit = async (data) => {
    try {
      await sendTestMessage.mutateAsync({
        eventId,
        phoneNumber: data.phoneNumber,
        channel: data.channel,
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
          <div className={styles.channelSelector}>
            <button
              type="button"
              className={`${styles.channelButton} ${channel === "whatsapp" ? styles.active : ""}`}
              onClick={() => setValue("channel", "whatsapp")}
            >
              {t("messaging.whatsapp")}
            </button>
            <button
              type="button"
              className={`${styles.channelButton} ${channel === "sms" ? styles.active : ""}`}
              onClick={() => setValue("channel", "sms")}
            >
              {t("messaging.sms")}
            </button>
          </div>

          <InputGroup
            name="phoneNumber"
            label={t("testMessage.phoneLabel")}
            placeholder="5xxxxxxxx"
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
