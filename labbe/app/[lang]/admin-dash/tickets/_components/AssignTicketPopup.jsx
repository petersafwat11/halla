"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { assignTicketSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AssignTicketPopup.module.css";

export default function AssignTicketPopup({ ticket, onClose }) {
  const { t } = useTranslation("adminDashboard");
  const queryClient = useQueryClient();

  const { data: assignees } = useQuery({
    queryKey: ["ticket-assignees"],
    queryFn: () => apiRequest({ method: "GET", path: API_PATHS.tickets.getAssignees }),
  });

  const assignTicket = useMutation({
    mutationFn: ({ ticketId, assigneeId }) =>
      apiRequest({ method: "PATCH", path: API_PATHS.tickets.assignTicket(ticketId), data: { assigneeId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

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
      await assignTicket.mutateAsync({
        ticketId: ticket.id || ticket._id,
        assigneeId: data.assigneeId,
      });
      toast.success(t("tickets.assignSuccess", "تم تعيين الشكوى بنجاح"));
      onClose();
    } catch (error) {
      toast.error(error.message || t("tickets.assignError", "فشل تعيين الشكوى"));
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("tickets.assignTicket", "تعيين الشكوى")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label>{t("tickets.form.subject", "الموضوع")}</label>
              <input type="text" value={ticket?.subject || ticket?.title || ""} disabled style={{ background: "#f5f5f5" }} />
            </div>
            <InputSelect
              label={t("tickets.form.assignTo", "تعيين إلى")}
              placeholder={t("tickets.form.selectAssignee", "اختر مشرف")}
              name="assigneeId"
              options={assigneeOptions}
              required
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("common.cancel", "إلغاء")}
                onClick={onClose}
                disabled={assignTicket.isPending}
              />
              <Button
                variant="primary"
                title={assignTicket.isPending ? t("common.loading", "جاري التعيين...") : t("common.assign", "تعيين")}
                type="submit"
                disabled={assignTicket.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
