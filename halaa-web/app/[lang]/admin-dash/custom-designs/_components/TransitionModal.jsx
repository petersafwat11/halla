"use client";

import { useState, useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import Button from "@/ui/commen/button/Button";
import { useAdminTransitionFulfillment } from "@/hooks/addons";
import { getNextFulfillmentStatus } from "@halaa/shared/constants/addons";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./TransitionModal.module.css";

export default function TransitionModal({ isOpen, onClose, order }) {
  const { t } = useTranslation("admin");
  const methods = useForm();
  const transitionMutation = useAdminTransitionFulfillment();

  const [customerNote, setCustomerNote] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");

  const nextStatus = order ? getNextFulfillmentStatus(order.status) : null;

  useEffect(() => {
    if (order && isOpen) {
      setCustomerNote(order.fulfillment?.customerNote || "");
      setInternalNotes(order.fulfillment?.internalNotes || "");
      if (order.fulfillment?.expectedDeliveryAt) {
        const d = new Date(order.fulfillment.expectedDeliveryAt);
        if (!isNaN(d.getTime())) {
          const pad = (value) => String(value).padStart(2, "0");
          setExpectedDeliveryAt(
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            + `T${pad(d.getHours())}:${pad(d.getMinutes())}`
          );
        } else {
          setExpectedDeliveryAt("");
        }
      } else {
        setExpectedDeliveryAt("");
      }
    }
  }, [order, isOpen]);

  if (!order || !nextStatus) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await transitionMutation.mutateAsync({
        addonId: order.id || order._id,
        toStatus: nextStatus,
        customerNote: customerNote.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : undefined,
      });
      toastUtils.success(t("customDesigns.transitionSuccess", "تم تحديث حالة الطلب بنجاح"));
      onClose();
    } catch (err) {
      toastUtils.error(err?.message || t("customDesigns.transitionError", "تعذر تحديث حالة الطلب"));
    }
  };

  const statusLabels = {
    paid: t("customDesigns.status.paid", "مدفوع"),
    queued: t("customDesigns.status.queued", "في الانتظار"),
    in_progress: t("customDesigns.status.in_progress", "قيد التنفيذ"),
    fulfilled: t("customDesigns.status.fulfilled", "مكتمل"),
  };

  const orderRef = (order.id || order._id || "").slice(-8).toUpperCase();

  return (
    <PopupLayout isOpen={isOpen} onClose={onClose} size="medium">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headingRow}>
          <h2 className={styles.title}>
            {t("customDesigns.modalTitle", "تحديث حالة التنفيذ")}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t("common.close", "Close")}>×</button>
          </div>
          <p className={styles.subtitle}>
            {t("customDesigns.orderRef", "طلب رقم")}: {orderRef}
          </p>
          <div className={styles.statusFlow}>
            <span>{statusLabels[order.status] || order.status}</span>
            <span className={styles.flowArrow}>&rarr;</span>
            <strong>{statusLabels[nextStatus] || nextStatus}</strong>
          </div>
        </div>

        <FormProvider {...methods}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <TextArea name="customerNote" label={t("customDesigns.customerNoteLabel")}
            placeholder={t("customDesigns.customerNotePlaceholder")} rows={3} maxLength={2000}
            direction="auto" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />

          <TextArea name="internalNotes" label={t("customDesigns.internalNotesLabel")}
            placeholder={t("customDesigns.internalNotesPlaceholder")} rows={2} maxLength={2000}
            direction="auto" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />

          <InputGroup name="expectedDeliveryAt" type="datetime-local"
            label={t("customDesigns.expectedDeliveryLabel")} value={expectedDeliveryAt}
            onChange={(e) => setExpectedDeliveryAt(e.target.value)} />

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
