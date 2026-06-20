"use client";

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import styles from "./CustomizeReminderPopup.module.css";
import { useForm, FormProvider } from "react-hook-form";
import Button from "@/ui/commen/button/Button";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import { toast } from "react-toastify";
import { useUpdateReminderSettings } from "@/hooks/events";
import useAuthStore from "@/stores/authStore";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Combine a YYYY-MM-DD-ish date and a 24h "HH:mm" string into a single
// local-time Date. Used to resolve the scheduled-send instant (the lower
// bound of the paid reminder window).
const combineDateTime = (date, hhmm) => {
  if (!date) return null;
  const base = date instanceof Date ? new Date(date) : new Date(date);
  if (Number.isNaN(base.getTime())) return null;
  if (typeof hhmm === "string") {
    const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      base.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
      return base;
    }
  }
  base.setHours(0, 0, 0, 0);
  return base;
};

const CustomizeReminderPopup = ({ onClose, eventId, event, existingSettings, onSuccess }) => {
  const { t } = useTranslation("home-events");
  const updateReminderSettings = useUpdateReminderSettings();
  const subscription = useAuthStore((s) => s.subscription);
  // No event-scoped plan flag is exposed on `event.subscription`; fall back to
  // the host's current plan code (same heuristic as ScheduleSendingPopup).
  const isTrial = subscription?.planCode === "trial";

  // Paid reminder window: [scheduledSend, event − 24h]. Lower bound is the
  // launch send time when scheduled, otherwise "now". Upper bound is 24h
  // before the event start. The backend is the source of truth and returns
  // REMINDER_OUT_OF_RANGE if the chosen instant falls outside.
  const sendInstant = useMemo(
    () =>
      combineDateTime(
        event?.launchSettings?.scheduledDate,
        event?.launchSettings?.scheduledTime
      ),
    [event?.launchSettings?.scheduledDate, event?.launchSettings?.scheduledTime]
  );

  const eventInstant = useMemo(() => {
    const d = event?.eventDetails?.date ? new Date(event.eventDetails.date) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  }, [event?.eventDetails?.date]);

  const lowerBound = useMemo(() => {
    const now = new Date();
    if (sendInstant && sendInstant.getTime() > now.getTime()) return sendInstant;
    return now;
  }, [sendInstant]);

  const upperBound = useMemo(
    () => (eventInstant ? new Date(eventInstant.getTime() - ONE_DAY_MS) : null),
    [eventInstant]
  );

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
      const chosenInstant = combineDateTime(new Date(data.date), time24);
      if (
        chosenInstant &&
        ((lowerBound && chosenInstant.getTime() < lowerBound.getTime()) ||
          (upperBound && chosenInstant.getTime() > upperBound.getTime()))
      ) {
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
              />
              <span className={styles.checkboxText}>
                {t("singleEvent.customReminderCheckbox", "Customize reminder time")}
              </span>
            </label>
          </div>

          {customReminderTime && (
            <>
              <div className={styles.inputContainer}>
                <DatePicker
                  name="date"
                  label={t("singleEvent.reminderCustomize.dateLabel", "Date")}
                  placeholder={t("singleEvent.reminderCustomize.selectDate", "Select date")}
                  required
                  minDate={lowerBound}
                  maxDate={upperBound || undefined}
                />

                <TimePicker
                  name="time"
                  label={t("singleEvent.reminderCustomize.timeLabel", "Time")}
                  required
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
