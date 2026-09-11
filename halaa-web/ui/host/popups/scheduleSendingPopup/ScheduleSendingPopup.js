"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { formatDate } from "@halaa/shared/utils/locale";
import styles from "./scheduleSendingPopup.module.css";
import { useForm, FormProvider } from "react-hook-form";
import Button from "@/ui/commen/button/Button";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import { toast } from "react-toastify";
import { useScheduleSend } from "@/hooks/messaging";
import useAuthStore from "@/stores/authStore";
import { toSubscriptionDTO } from "@halaa/shared/utils";
import {
  getScheduleWindow,
  getScheduleTimeBounds,
  validateScheduleSelection,
} from "@halaa/shared/utils/schedulingWindow";

const ScheduleSendingPopup = ({
  onClose,
  eventId,
  onSuccess,
  existingSchedule,
  eventDate,
  eventTime,
  eventIsTrial,
}) => {
  const { t, i18n } = useTranslation("common");
  const scheduleSend = useScheduleSend();
  const rawSubscription = useAuthStore((s) => s.subscription);
  const subscription = useMemo(
    () => toSubscriptionDTO(rawSubscription),
    [rawSubscription]
  );
  const isTrial =
    typeof eventIsTrial === "boolean" ? eventIsTrial :
      subscription?.planCode === "trial" || subscription?.planType === "trial";

  // Live scheduling window: [now + minLead, event − 3d].
  //   minLead: trial = 15min, paid = 24h.
  //   upper bound: 3 days before the event start.
  // The picker is day-granular, so we floor each bound to its calendar day;
  // the backend is authoritative on the exact instant and returns
  // SCHEDULE_TOO_SOON / SCHEDULE_TOO_LATE for boundary cases.
  const scheduleWindow = useMemo(
    () => getScheduleWindow({ isTrial, eventDate, eventTime }),
    [isTrial, eventDate, eventTime]
  );
  const minDate = scheduleWindow.minimumDate;
  const maxDate = scheduleWindow.maximumDate;

  // Human-readable window for the live hint under the date input.
  const windowText = useMemo(() => {
    const fmt = (d) =>
      d
        ? formatDate(d, i18n.language || "ar", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Riyadh",
          })
        : null;
    const from = fmt(scheduleWindow.earliestInstant);
    const to = fmt(scheduleWindow.latestInstant);
    if (from && to) return { from, to };
    if (from) return { from, to: null };
    return null;
  }, [scheduleWindow, i18n.language]);

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
    },
  });
  const selectedDate = methods.watch("date");
  const timeBounds = useMemo(
    () => getScheduleTimeBounds(selectedDate, scheduleWindow),
    [selectedDate, scheduleWindow]
  );

  useEffect(() => {
    if (!selectedDate) return;
    const value24 = to24h(methods.getValues("time"));
    if (!value24) return;
    const [hour, minute] = value24.split(":").map(Number);
    const valueMinutes = hour * 60 + minute;
    if (valueMinutes < timeBounds.minimumMinutes) {
      methods.setValue("time", fromHHmm(`${String(Math.floor(timeBounds.minimumMinutes / 60)).padStart(2, "0")}:${String(timeBounds.minimumMinutes % 60).padStart(2, "0")}`));
    } else if (valueMinutes > timeBounds.maximumMinutes) {
      methods.setValue("time", fromHHmm(`${String(Math.floor(timeBounds.maximumMinutes / 60)).padStart(2, "0")}:${String(timeBounds.maximumMinutes % 60).padStart(2, "0")}`));
    }
  }, [selectedDate, timeBounds, methods]);

  useEffect(() => {
    methods.reset({
      date: existingSchedule?.scheduledDate
        ? new Date(existingSchedule.scheduledDate)
        : null,
      time: fromHHmm(existingSchedule?.scheduledTime),
    });
  }, [
    existingSchedule?.scheduledDate,
    existingSchedule?.scheduledTime,
    methods,
  ]);

  const onSubmit = async (data) => {
    if (!data.date || !data.time) {
      toast.error(t("schedule_date_time_required"));
      return;
    }

    const time24 = to24h(data.time);
    if (!time24) {
      toast.error(t("schedule_invalid_time"));
      return;
    }

    const validation = validateScheduleSelection({
      date: data.date,
      time: time24,
      isTrial,
      eventDate,
      eventTime,
    });
    if (validation.reason === "tooSoon") {
      toast.error(t("schedule_too_soon"));
      return;
    }
    if (validation.reason === "tooLate" || !scheduleWindow.hasValidWindow) {
      toast.error(t("schedule_too_late"));
      return;
    }
    if (!validation.valid) {
      toast.error(t("schedule_invalid_time"));
      return;
    }

    try {
      await scheduleSend.mutateAsync({
        eventId,
        scheduledDate: toUtcMidnightIso(new Date(data.date)),
        scheduledTime: time24,
      });

      toast.success(t("schedule_message_success"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error scheduling message:", error);
      const code = error?.code || error?.response?.data?.code;
      if (code === "SCHEDULE_TOO_SOON" || code === "EVENT_DATE_TOO_SOON") {
        toast.error(t("schedule_too_soon"));
      } else if (code === "SCHEDULE_TOO_LATE") {
        toast.error(t("schedule_too_late"));
      } else {
        toast.error(
          error?.response?.data?.message || t("schedule_message_failed")
        );
      }
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

          <div className={styles.inputContainer}>
            <DatePicker
              name="date"
              label={t("schedule_date") || "Date"}
              placeholder={t("select_date") || "Select date"}
              required
              minDate={minDate}
              maxDate={maxDate}
            />

            <TimePicker
              name="time"
              label={t("schedule_time") || "Time"}
              required
              minimumMinutes={timeBounds.minimumMinutes}
              maximumMinutes={timeBounds.maximumMinutes}
            />
          </div>

          {windowText && (
            <small className={styles.windowHint}>
              {windowText.to
                ? t("schedule_window_range", {
                    defaultValue: "You can schedule between {{from}} and {{to}}.",
                    from: windowText.from,
                    to: windowText.to,
                  })
                : t("schedule_window_from", {
                    defaultValue: "Earliest you can schedule: {{from}}.",
                    from: windowText.from,
                  })}
            </small>
          )}
          {!scheduleWindow.hasValidWindow && <p role="alert">{t('schedule_no_window')}</p>}

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
              disabled={scheduleSend.isPending || !scheduleWindow.hasValidWindow}
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default ScheduleSendingPopup;
