"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import styles from "./CustomizeReminderPopup.module.css";
import { useForm, FormProvider } from "react-hook-form";
import Button from "@/ui/commen/button/Button";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import { toast } from "react-toastify";
import { useUpdateReminderSettings } from "@/hooks/events";

const CustomizeReminderPopup = ({ onClose, eventId, existingSettings, onSuccess }) => {
  const { t } = useTranslation("home-events");
  const updateReminderSettings = useUpdateReminderSettings();

  const toUtcMidnightIso = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    ).toISOString();
  };

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
      customReminderTime: !!existingSettings?.customReminderTime,
      date: existingSettings?.scheduledDate
        ? new Date(existingSettings.scheduledDate)
        : null,
      time: fromHHmm(existingSettings?.scheduledTime),
    },
  });

  const customReminderTime = methods.watch("customReminderTime");

  const onSubmit = async (data) => {
    let payload = {
      customReminderTime: data.customReminderTime,
    };

    if (data.customReminderTime) {
      if (!data.date || !data.time) {
        toast.error(t("singleEvent.scheduleReminder.errors.dateOutOfRange", "Date and time are required for custom reminder"));
        return;
      }

      const selectedDate = new Date(data.date);
      const time24 = to24h(data.time);
      if (!time24) {
        toast.error(t("singleEvent.scheduleReminder.errors.generic", "Invalid time selected"));
        return;
      }

      payload.scheduledDate = toUtcMidnightIso(selectedDate);
      payload.scheduledTime = time24;
    } else {
      payload.scheduledDate = null;
      payload.scheduledTime = null;
    }

    try {
      await updateReminderSettings.mutateAsync({
        eventId,
        data: payload,
      });

      toast.success(t("singleEvent.saveSuccess", "Reminder settings saved successfully"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating reminder settings:", error);
      toast.error(
        error?.response?.data?.message || t("singleEvent.scheduleReminder.errors.generic", "Failed to save reminder settings")
      );
    }
  };

  return (
    <div className={styles.popup}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {t("singleEvent.customizeReminderModalTitle", "Customize automatic reminder")}
        </h2>
        <button className={styles.closeButton} onClick={onClose} type="button">
          <Image src="/svg/events/close.svg" alt="close" width={24} height={24} />
        </button>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.content}>
          <div className={styles.checkboxContainer}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                {...methods.register("customReminderTime")}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>
                {t("singleEvent.customReminderCheckbox", "Customize reminder time")}
              </span>
            </label>
          </div>

          {customReminderTime && (
            <div className={styles.inputContainer}>
              <DatePicker
                name="date"
                label={t("singleEvent.scheduleReminder.dateLabel", "Date")}
                placeholder={t("singleEvent.scheduleReminder.selectAll", "Select date")}
                required
              />

              <TimePicker
                name="time"
                label={t("singleEvent.scheduleReminder.timeLabel", "Time")}
                required
              />
            </div>
          )}

          <div className={styles.actions}>
            <Button
              variant="outline"
              title={t("singleEvent.scheduleReminder.cancel", "Cancel")}
              onClick={onClose}
              type="button"
              disabled={updateReminderSettings.isPending}
            />
            <Button
              variant="primary"
              title={t("singleEvent.save", "Save")}
              type="submit"
              disabled={updateReminderSettings.isPending}
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default CustomizeReminderPopup;
