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
import { useScheduleSend } from "@/hooks/messaging";

const ScheduleSendingPopup = ({ onClose, eventId, onSuccess, existingSchedule }) => {
  const { t } = useTranslation("common");
  const scheduleSend = useScheduleSend();

  // Picker hint: minimum allowed day is two days out (00:00). The
  // authoritative 48h lead-time check lives on the backend; if the
  // combined date+time still falls under it, the API returns
  // SCHEDULE_TOO_SOON and the toast surfaces that message.
  const getTwoDaysFromNow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Build a UTC-midnight ISO string from a Date's local Y/M/D
  // components. The DatePicker emits a Date at local 00:00; calling
  // `.toISOString()` directly shifts it back a day in any UTC+ zone,
  // which makes the backend (which reads `getUTCDate()`) think the
  // host meant the previous calendar day.
  const toUtcMidnightIso = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    ).toISOString();
  };

  // Backend stores `scheduledTime` as 24h "HH:mm"; the picker speaks
  // "HH:MM:AM/PM". Convert in both directions at this boundary.
  const to24h = (ampmTime) => {
    if (!ampmTime || typeof ampmTime !== "string") return null;
    const m = ampmTime.match(/^(\d{1,2}):(\d{2}):(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (h < 1 || h > 12 || mm < 0 || mm > 59) return null;
    const ampm = m[3].toUpperCase();
    if (ampm === "AM" && h === 12) h = 0;
    else if (ampm === "PM" && h !== 12) h += 12;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const fromHHmm = (hhmm) => {
    if (!hhmm || typeof hhmm !== "string") return "12:00:AM";
    const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return "12:00:AM";
    const h24 = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (h24 < 0 || h24 > 23 || mm < 0 || mm > 59) return "12:00:AM";
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${ampm}`;
  };

  const methods = useForm({
    defaultValues: {
      date: existingSchedule?.scheduledDate
        ? new Date(existingSchedule.scheduledDate)
        : null,
      time: fromHHmm(existingSchedule?.scheduledTime),
      channel: existingSchedule?.preferredChannel || "whatsapp",
    },
  });

  const channel = methods.watch("channel");

  const onSubmit = async (data) => {
    if (!data.date || !data.time) {
      toast.error(t("schedule_date_time_required"));
      return;
    }

    const selectedDate = new Date(data.date);
    const minDate = getTwoDaysFromNow();
    if (selectedDate < minDate) {
      toast.error(t("schedule_min_days_error"));
      return;
    }

    const time24 = to24h(data.time);
    if (!time24) {
      toast.error(t("schedule_invalid_time"));
      return;
    }

    try {
      await scheduleSend.mutateAsync({
        eventId,
        scheduledDate: toUtcMidnightIso(selectedDate),
        scheduledTime: time24,
        channel: data.channel,
      });

      toast.success(t("schedule_message_success"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error scheduling message:", error);
      toast.error(
        error?.response?.data?.message || t("schedule_message_failed")
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
