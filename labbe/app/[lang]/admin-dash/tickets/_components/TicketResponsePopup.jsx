"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { useTicketMutation } from "@/hooks/reactQueryHooks/useTickets";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import { ticketResponseSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./TicketResponsePopup.module.css";

export default function TicketResponsePopup({ ticket, onClose, viewOnly = false, onSuccess }) {
  const { t } = useTranslation("adminTickets");
  const updateTicket = useTicketMutation("updateStatus");

  const methods = useForm({
    resolver: zodResolver(ticketResponseSchema),
    defaultValues: { resolution: "" },
  });

  const onSubmit = async (data) => {
    try {
      await updateTicket.mutateAsync({
        ticketId: ticket.id,
        status: "resolved",
        resolution: data.resolution,
      });
      toastUtils.success(t("close.success"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "close.error" });
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>
            {viewOnly
              ? t("viewResolution.title")
              : t("close.title")}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>{t("close.type")}</label>
            <input
              type="text"
              value={ticket?.subject || ""}
              disabled
              className={styles.disabledInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("close.originalMessage")}</label>
            <textarea
              value={ticket?.message || ""}
              disabled
              className={`${styles.disabledInput} ${styles.disabledTextarea}`}
            />
          </div>

          {viewOnly ? (
            <>
              <div className={styles.formGroup}>
                <label>{t("viewResolution.resolutionMessage")}</label>
                <textarea
                  value={ticket?.resolution?.message || ""}
                  disabled
                  className={`${styles.disabledInput} ${styles.disabledTextarea}`}
                />
              </div>
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  title={t("viewResolution.close")}
                  onClick={onClose}
                />
              </div>
            </>
          ) : (
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)}>
                <TextArea
                  label={t("close.resolutionLabel")}
                  placeholder={t("close.resolutionPlaceholder")}
                  name="resolution"
                  required
                  rows={5}
                  maxLength={5000}
                />
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    title={t("close.cancel")}
                    onClick={onClose}
                    disabled={updateTicket.isPending}
                  />
                  <Button
                    variant="primary"
                    title={updateTicket.isPending ? t("close.closing") : t("close.submit")}
                    type="submit"
                    disabled={updateTicket.isPending}
                  />
                </div>
              </form>
            </FormProvider>
          )}
        </div>
      </div>
    </PopupLayout>
  );
}
