"use client";

import { useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import Button from "@/ui/commen/button/Button";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAdminTransitionFulfillment } from "@/hooks/addons";
import { getNextFulfillmentStatus } from "@halaa/shared/constants/addons";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./TransitionModal.module.css";

const DEFAULT_TIME = "12:00:AM";

// The TimePicker speaks "HH:MM:AM/PM"; an instant needs 24h components.
const to24h = (ampmTime) => {
  const match = String(ampmTime || "").match(/^(\d{1,2}):(\d{2}):(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  const meridiem = match[3].toUpperCase();
  if (meridiem === "AM" && hour === 12) hour = 0;
  else if (meridiem === "PM" && hour !== 12) hour += 12;
  return { hour, minute };
};

const fromDate = (date) => {
  const hour24 = date.getHours();
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${meridiem}`;
};

export default function TransitionModal({ isOpen, onClose, order }) {
  const { t } = useTranslation("admin");
  const methods = useForm({
    defaultValues: {
      customerNote: "",
      internalNotes: "",
      expectedDeliveryDate: null,
      expectedDeliveryTime: DEFAULT_TIME,
    },
  });
  const { reset, getValues } = methods;
  const transitionMutation = useAdminTransitionFulfillment();

  const nextStatus = order ? getNextFulfillmentStatus(order.status) : null;

  useEffect(() => {
    if (!order || !isOpen) return;
    const existing = order.fulfillment?.expectedDeliveryAt
      ? new Date(order.fulfillment.expectedDeliveryAt)
      : null;
    const hasExisting = existing && !Number.isNaN(existing.getTime());
    reset({
      customerNote: order.fulfillment?.customerNote || "",
      internalNotes: order.fulfillment?.internalNotes || "",
      expectedDeliveryDate: hasExisting ? existing : null,
      expectedDeliveryTime: hasExisting ? fromDate(existing) : DEFAULT_TIME,
    });
  }, [order, isOpen, reset]);

  // Delivery is always promised forward, so the calendar starts today.
  const minDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  if (!order || !nextStatus) return null;

  // Colors come from the shared status→tone map; the label stays keyed.
  const statusLabel = (status) => t(`customDesigns.status.${status}`, status);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const values = getValues();

    // Date and time are picked separately; only a date makes an instant, and a
    // time without one is ignored rather than silently dated today.
    let expectedDeliveryAt;
    if (values.expectedDeliveryDate) {
      const day = new Date(values.expectedDeliveryDate);
      const time = to24h(values.expectedDeliveryTime) || { hour: 0, minute: 0 };
      expectedDeliveryAt = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        time.hour,
        time.minute
      ).toISOString();
    }

    try {
      await transitionMutation.mutateAsync({
        addonId: order.id || order._id,
        toStatus: nextStatus,
        customerNote: values.customerNote?.trim() || undefined,
        internalNotes: values.internalNotes?.trim() || undefined,
        expectedDeliveryAt,
      });
      toastUtils.success(t("customDesigns.transitionSuccess", "تم تحديث حالة الطلب بنجاح"));
      onClose();
    } catch (err) {
      toastUtils.error(err?.message || t("customDesigns.transitionError", "تعذر تحديث حالة الطلب"));
    }
  };

  const orderRef = (order.id || order._id || "").slice(-8).toUpperCase();

  return (
    <PopupLayout isOpen={isOpen} onClose={onClose} size="medium">
      <div className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.headingRow}>
            <div className={styles.headingText}>
              <h2 className={styles.title}>
                {t("customDesigns.modalTitle", "تحديث حالة التنفيذ")}
              </h2>
              <p className={styles.subtitle}>
                {t("customDesigns.orderRef", "طلب رقم")}
                {": "}
                <span className={styles.orderRef} dir="ltr">{orderRef}</span>
              </p>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label={t("common.close", "Close")}
            >
              &times;
            </button>
          </div>

          {/* The transition itself, as from → to badges rather than plain text. */}
          <div className={styles.statusFlow}>
            <StatusBadge
              status={order.status}
              domain="fulfillment"
              text={statusLabel(order.status)}
            />
            <span className={styles.flowArrow} aria-hidden="true">&rarr;</span>
            <StatusBadge
              status={nextStatus}
              domain="fulfillment"
              text={statusLabel(nextStatus)}
            />
          </div>
        </header>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <TextArea
              name="customerNote"
              label={t("customDesigns.customerNoteLabel")}
              placeholder={t("customDesigns.customerNotePlaceholder")}
              rows={3}
              maxLength={2000}
              direction="auto"
            />

            <TextArea
              name="internalNotes"
              label={t("customDesigns.internalNotesLabel")}
              placeholder={t("customDesigns.internalNotesPlaceholder")}
              rows={2}
              maxLength={2000}
              direction="auto"
            />

            <div className={styles.deliveryRow}>
              <DatePicker
                name="expectedDeliveryDate"
                label={t("customDesigns.expectedDeliveryLabel")}
                placeholder={t("customDesigns.expectedDeliveryPlaceholder")}
                required={false}
                minDate={minDate}
              />
              <TimePicker
                name="expectedDeliveryTime"
                label={t("customDesigns.expectedDeliveryTimeLabel")}
              />
            </div>

            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={transitionMutation.isPending}
                title={t("common.cancel", "إلغاء")}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={transitionMutation.isPending}
                title={transitionMutation.isPending
                  ? t("common.saving", "جاري الحفظ...")
                  : t("customDesigns.confirmTransition", "تأكيد التحديث")}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
