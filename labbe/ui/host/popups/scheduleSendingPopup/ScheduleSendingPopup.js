"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import styles from "./scheduleSendingPopup.module.css";
import { useForm, FormProvider } from "react-hook-form";
import Button from "@/ui/commen/button/Button";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import { toast } from "react-toastify";
import { useEventMutation } from "@/hooks/reactQueryHooks/useEvents";

const ScheduleSendingPopup = ({ onClose, eventId, onSuccess, existingSchedule }) => {
  const { t } = useTranslation("common");
  const scheduleSend = useEventMutation("scheduleSend");

  // Calculate minimum date (2 days from now)
  const getTwoDaysFromNow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date;
  };

  const methods = useForm({
    defaultValues: {
      date: existingSchedule?.scheduledDate || null,
      time: existingSchedule?.scheduledTime || "12:00:AM",
      channel: "whatsapp",
    },
  });

  const channel = methods.watch("channel");

  const onSubmit = async (data) => {
    if (!data.date || !data.time) {
      toast.error("Please select both date and time");
      return;
    }

    // Validate that date is at least 2 days from now
    const selectedDate = new Date(data.date);
    const minDate = getTwoDaysFromNow();

    if (selectedDate < minDate) {
      toast.error("Scheduled date must be at least 2 days from now");
      return;
    }

    try {
      await scheduleSend.mutateAsync({
        eventId,
        scheduledDate: data.date,
        scheduledTime: data.time,
        channel: data.channel,
      });

      toast.success("Message scheduled successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error scheduling message:", error);
      toast.error(
        error?.response?.data?.message || "Failed to schedule message"
      );
    }
  };

  return (
    <div className={styles.popup}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {t("schedule_sending") || "Schedule Sending"}
        </h2>
        <button className={styles.closeButton} onClick={onClose}>
          <Image src="/svg/events/close.svg" alt="close" width={24} height={24} />
        </button>
      </div>

      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className={styles.content}
        >
          <p className={styles.description}>
            {t("schedule_sending_description") ||
              "Select when you would like to send the message"}
          </p>

          <div className={styles.channelSelector}>
            <button
              type="button"
              className={`${styles.channelButton} ${channel === "whatsapp" ? styles.active : ""}`}
              onClick={() => methods.setValue("channel", "whatsapp")}
            >
              {t("whatsapp") || "WhatsApp"}
            </button>
            <button
              type="button"
              className={`${styles.channelButton} ${channel === "sms" ? styles.active : ""}`}
              onClick={() => methods.setValue("channel", "sms")}
            >
              {t("sms") || "SMS"}
            </button>
          </div>

          <div className={styles.inputContainer}>
            <DatePicker
              name="date"
              label={t("schedule_date") || "Date"}
              placeholder={t("select_date") || "Select date"}
              required
              minDate={getTwoDaysFromNow()}
            />

            <TimePicker
              name="time"
              label={t("schedule_time") || "Time"}
              required
            />
          </div>

          <div className={styles.actions}>
            <Button
              variant="outline"
              title={t("cancel") || "Cancel"}
              onClick={onClose}
              type="button"
              disabled={scheduleSend.isPending}
            />
            <Button
              variant="primary"
              title={t("confirm") || "Confirm"}
              type="submit"
              disabled={scheduleSend.isPending}
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default ScheduleSendingPopup;
