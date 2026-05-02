"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import { ticketResponseSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AssignTicketPopup.module.css";

export default function TicketResponsePopup({ ticket, onClose, viewOnly = false }) {
  const { t } = useTranslation("adminDashboard");
  const queryClient = useQueryClient();

  const updateTicket = useMutation({
    mutationFn: ({ ticketId, data }) =>
      apiRequest({ method: "PATCH", path: API_PATHS.tickets.updateTicketStatus(ticketId), data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const methods = useForm({
    resolver: zodResolver(ticketResponseSchema),
    defaultValues: { response: "" },
  });

  const onSubmit = async (data) => {
    try {
      await updateTicket.mutateAsync({
        ticketId: ticket.id || ticket._id,
        data: { resolution: data.response, status: "resolved" },
      });
      toast.success(t("tickets.responseSuccess", "تم إرسال الرد بنجاح"));
      onClose();
    } catch (error) {
      toast.error(error.message || t("tickets.responseError", "فشل إرسال الرد"));
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>
            {viewOnly
              ? t("tickets.viewResolution", "عرض الحل")
              : t("tickets.respondToTicket", "الرد على الشكوى")}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>{t("tickets.form.subject", "الموضوع")}</label>
            <input
              type="text"
              value={ticket?.subject || ""}
              disabled
              style={{ background: "#f5f5f5" }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("tickets.form.description", "الشكوى")}</label>
            <textarea
              value={ticket?.message || ""}
              disabled
              style={{ background: "#f5f5f5", minHeight: "100px" }}
            />
          </div>

          {viewOnly ? (
            <>
              <div className={styles.formGroup}>
                <label>{t("tickets.form.resolution", "الحل")}</label>
                <textarea
                  value={ticket?.resolution?.message || ""}
                  disabled
                  style={{ background: "#f5f5f5", minHeight: "100px" }}
                />
              </div>
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  title={t("common.close", "إغلاق")}
                  onClick={onClose}
                />
              </div>
            </>
          ) : (
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)}>
                <TextArea
                  label={t("tickets.form.response", "الرد")}
                  placeholder={t("tickets.form.responsePlaceholder", "اكتب ردك هنا...")}
                  name="response"
                  required
                  rows={5}
                  maxLength={5000}
                />
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    title={t("common.cancel", "إلغاء")}
                    onClick={onClose}
                    disabled={updateTicket.isPending}
                  />
                  <Button
                    variant="primary"
                    title={updateTicket.isPending ? t("common.loading", "جاري الإرسال...") : t("common.send", "إرسال")}
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
