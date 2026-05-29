"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { useTicketAssignees, useTicketMutation } from "@/hooks/tickets";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { assignTicketSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AssignTicketPopup.module.css";

export default function AssignTicketPopup({ ticket, onClose, onSuccess }) {
  const { t } = useTranslation("adminTickets");
  const { data: assignees } = useTicketAssignees();
  const assignMutation = useTicketMutation("assignTicket");

  const assigneeOptions = (assignees?.data || []).map((a) => ({
    label: a.username || a.name,
    value: a._id || a.id,
  }));

  const methods = useForm({
    resolver: zodResolver(assignTicketSchema),
    defaultValues: { assigneeId: "" },
  });

  const onSubmit = async (data) => {
    try {
      await assignMutation.mutateAsync({
        ticketId: ticket.id || ticket._id,
        assigneeId: data.assigneeId,
      });
      toastUtils.success(t("assign.success"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "assign.error" });
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("assign.title")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label>{t("assign.ticketMessage")}</label>
              <input
                type="text"
                value={ticket?.subject || ticket?.title || ""}
                disabled
                className={styles.disabledInput}
              />
            </div>
            <InputSelect
              label={t("assign.selectModeratorLabel")}
              placeholder={t("assign.selectPlaceholder")}
              name="assigneeId"
              options={assigneeOptions}
              required
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("assign.cancel")}
                onClick={onClose}
                disabled={assignMutation.isPending}
              />
              <Button
                variant="primary"
                title={assignMutation.isPending ? t("assign.assigning") : t("assign.submit")}
                type="submit"
                disabled={assignMutation.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
