"use client";
import React from "react";
import styles from "./ScheduleEventPopup.module.css";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import Button from "@/ui/commen/button/Button";
import Image from "next/image";

const scheduleEventSchema = (t) =>
  z.object({
    scheduledDate: z.date({
      required_error: t("scheduleEvent.validation.dateRequired"),
    }),
    scheduledTime: z.string().min(1, t("scheduleEvent.validation.timeRequired")),
  });

function ScheduleEventPopup({ isOpen, onClose, onConfirm, eventId }) {
  const { t } = useTranslation("home-events");

  const methods = useForm({
    resolver: zodResolver(scheduleEventSchema(t)),
    defaultValues: {
      scheduledDate: null,
      scheduledTime: "",
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
  } = methods;

  if (!isOpen) return null;

  const onSubmit = async (data) => {
    await onConfirm({
      eventId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
    });
    methods.reset();
    onClose();
  };

  const handleCancel = () => {
    methods.reset();
    onClose();
  };

  return (
    <FormProvider {...methods}>
      <div className={styles.overlay} onClick={handleCancel}>
        <form className={styles.popup} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.header}>
            <h2 className={styles.title}>{t("lastEvent.scheduleEvent")}</h2>
            <button type="button" className={styles.closeButton} onClick={handleCancel}>
              <Image src="/svg/events/close.svg" alt="close" width={24} height={24} />
            </button>
          </div>

          <div className={styles.content}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>{t("scheduleEvent.dateLabel")}</label>
              <DatePicker
                name="scheduledDate"
                placeholder={t("scheduleEvent.datePlaceholder")}
                required={true}
              />
              {errors.scheduledDate && (
                <span className={styles.error}>{errors.scheduledDate.message}</span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>{t("scheduleEvent.timeLabel")}</label>
              <TimePicker
                name="scheduledTime"
                placeholder={t("scheduleEvent.timePlaceholder")}
                required={true}
              />
              {errors.scheduledTime && (
                <span className={styles.error}>{errors.scheduledTime.message}</span>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              variant="secondary"
              title={t("common.cancel")}
              onClick={handleCancel}
              disabled={isSubmitting}
            />
            <Button
              variant="primary"
              title={isSubmitting ? t("common.sending") : t("scheduleEvent.confirm")}
              type="submit"
              disabled={isSubmitting}
            />
          </div>
        </form>
      </div>
    </FormProvider>
  );
}

export default ScheduleEventPopup;
