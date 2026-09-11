"use client";
import {
  getReminderWindow,
  getScheduleTimeBounds,
  instantToPickerDay,
  validateReminderSelection,
} from "@halaa/shared/utils/schedulingWindow";

import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import styles from "./CustomizeReminderPopup.module.css";
import { useForm, FormProvider } from "react-hook-form";
import Button from "@/ui/commen/button/Button";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import { toast } from "react-toastify";
import { useUpdateReminderSettings } from "@/hooks/events";

const CustomizeReminderPopup = ({ onClose, eventId, event, existingSettings, onSuccess }) => {
  const { t } = useTranslation("home-events");
  const updateReminderSettings = useUpdateReminderSettings();
  // Admins may manage another host's event; use that event's entitlement.
  const isTrial = event?.capabilities?.isTrial ?? event?.subscription?.isTrial ??
    (event?.subscription?.planCode === "trial");

  // Paid reminder window: [scheduledSend, event − 24h]. Lower bound is the
  // launch send time when scheduled, otherwise "now". Upper bound is 24h
  // before the event start. The backend is the source of truth and returns
  // REMINDER_OUT_OF_RANGE if the chosen instant falls outside.
  const reminderWindow = useMemo(() => getReminderWindow({
    scheduledDate: event?.launchSettings?.scheduledDate,
    scheduledTime: event?.launchSettings?.scheduledTime,
    eventDate: event?.eventDetails?.date || event?.date,
    eventTime: event?.eventDetails?.time || event?.time,
  }), [event]);
  const lowerBound = reminderWindow.earliestInstant;
  const upperBound = reminderWindow.latestInstant;

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
        ? instantToPickerDay(existingSettings.scheduledDate)
        : null,
      time: fromHHmm(existingSettings?.scheduledTime),
    },
  });

  useEffect(() => {
    methods.reset({
      customReminderTime: isTrial
        ? false
        : !!existingSettings?.customReminderTime,
      date: existingSettings?.scheduledDate
        ? instantToPickerDay(existingSettings.scheduledDate)
        : null,
      time: fromHHmm(existingSettings?.scheduledTime),
    });
  }, [
    existingSettings?.customReminderTime,
    existingSettings?.scheduledDate,
    existingSettings?.scheduledTime,
    isTrial,
    methods,
  ]);

  const customReminderTime = methods.watch("customReminderTime");
  const selectedDate = methods.watch("date");
  const timeBounds = useMemo(
    () => getScheduleTimeBounds(selectedDate, reminderWindow),
    [selectedDate, reminderWindow]
  );

  useEffect(() => {
    if (!selectedDate) return;
    const value24 = to24h(methods.getValues("time"));
    if (!value24) return;
    const [hour, minute] = value24.split(":").map(Number);
    const valueMinutes = hour * 60 + minute;
    if (valueMinutes < timeBounds.minimumMinutes) {
      const min = timeBounds.minimumMinutes;
      methods.setValue("time", fromHHmm(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`));
    } else if (valueMinutes > timeBounds.maximumMinutes) {
      const max = timeBounds.maximumMinutes;
      methods.setValue("time", fromHHmm(`${String(Math.floor(max / 60)).padStart(2, "0")}:${String(max % 60).padStart(2, "0")}`));
    }
  }, [selectedDate, timeBounds, methods]);

  const onSubmit = async (data) => {
    let payload = {
      customReminderTime: data.customReminderTime,
    };

    if (data.customReminderTime) {
      if (!data.date || !data.time) {
        toast.error(t("singleEvent.reminderCustomize.errors.dateTimeRequired", "Date and time are required for custom reminder"));
        return;
      }

      const time24 = to24h(data.time);
      if (!time24) {
        toast.error(t("singleEvent.reminderCustomize.errors.generic", "Invalid time selected"));
        return;
      }

      // Client-side guard against the paid window [scheduledSend, event−24h].
      // The backend is authoritative and returns REMINDER_OUT_OF_RANGE, but
      // catching it here saves a round-trip and reads clearer.
      const validation = validateReminderSelection({
        date: data.date,
        time: time24,
        scheduledDate: event?.launchSettings?.scheduledDate,
        scheduledTime: event?.launchSettings?.scheduledTime,
        eventDate: event?.eventDetails?.date || event?.date,
        eventTime: event?.eventDetails?.time || event?.time,
      });
      if (!validation.valid || !reminderWindow.hasValidWindow) {
        toast.error(t("singleEvent.reminderCustomize.errors.outOfRange", "The reminder time must be after sending starts and at least 24 hours before the event."));
        return;
      }

      payload.scheduledDate = toUtcMidnightIso(new Date(data.date));
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
      const code = error?.response?.data?.code;
      if (code === "REMINDER_OUT_OF_RANGE") {
        toast.error(t("singleEvent.reminderCustomize.errors.outOfRange", "The reminder time must be after sending starts and at least 24 hours before the event."));
      } else {
        toast.error(
          error?.response?.data?.message || t("singleEvent.reminderCustomize.errors.generic", "Failed to save reminder settings")
        );
      }
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
          <p className={styles.description}>
            {t(
              "singleEvent.reminderCustomize.description",
              "We send a free reminder to your confirmed guests before the event."
            )}
          </p>

          {isTrial && (
            // The event's plan isn't exposed on the event payload, so this is
            // derived from the host's *current* account plan and may be a hint
            // rather than ground truth for per-event plans. Show it as
            // advisory text only — never block saving on it. The backend is
            // authoritative: trial events get an auto reminder (send + 10min)
            // and reject customization with REMINDER_OUT_OF_RANGE if needed.
            <p className={styles.trialInfo}>
              {t(
                "singleEvent.reminderCustomize.trialInfo",
                "On the trial plan, the reminder is sent automatically 10 minutes after invitations go out and can't be customized."
              )}
            </p>
          )}

          <div className={styles.checkboxContainer}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                {...methods.register("customReminderTime")}
                className={styles.checkbox}
                disabled={isTrial}
              />
              <span className={styles.checkboxText}>
                {t("singleEvent.customReminderCheckbox", "Customize reminder time")}
              </span>
            </label>
          </div>

          {customReminderTime && !isTrial && (
            <>
              <div className={styles.inputContainer}>
                <DatePicker
                  name="date"
                  label={t("singleEvent.reminderCustomize.dateLabel", "Date")}
                  placeholder={t("singleEvent.reminderCustomize.selectDate", "Select date")}
                  required
                  minDate={instantToPickerDay(lowerBound)}
                  maxDate={upperBound ? instantToPickerDay(upperBound) : undefined}
                />

                <TimePicker
                  name="time"
                  label={t("singleEvent.reminderCustomize.timeLabel", "Time")}
                  required
                  minimumMinutes={timeBounds.minimumMinutes}
                  maximumMinutes={timeBounds.maximumMinutes}
                />
              </div>
              <small className={styles.windowHint}>
                {t(
                  "singleEvent.reminderCustomize.windowHint",
                  "Choose a time after sending starts and at least 24 hours before the event."
                )}
              </small>
            </>
          )}

          <div className={styles.actions}>
            <Button
              variant="outline"
              title={t("singleEvent.reminderCustomize.cancel", "Cancel")}
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
