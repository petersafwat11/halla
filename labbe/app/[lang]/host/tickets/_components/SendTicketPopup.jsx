"use client";
import React, { useState, useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./SendTicketPopup.module.css";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import Button from "@/ui/commen/button/Button";
import { useTicketMutation } from "@/hooks/reactQueryHooks/useTickets";
import { toast } from "react-toastify";

// Schema for the form (maps to backend field names)
const getComplaintSchema = (t) =>
  z.object({
    subject: z
      .string()
      .min(1, t("validation.subjectRequired") || "يجب إدخال موضوع الشكوى"),
    complaintType: z
      .string()
      .min(1, t("validation.typeRequired") || "يجب اختيار نوع الشكوى"),
    complaintText: z
      .string()
      .min(
        10,
        t("validation.messageRequired") ||
        "يجب إدخال نص الشكوى (10 أحرف على الأقل)"
      ),
    priority: z.string().optional(),
  });

// Get ticket types from service helper
const getComplaintTypes = (t) => [
  { label: t("types.technical") || "مشكلة تقنية", value: "technical" },
  { label: t("types.payment") || "مشكلة في الدفع", value: "payment" },
  { label: t("types.event") || "مشكلة في الفعالية", value: "event" },
  { label: t("types.user") || "شكوى من مستخدم", value: "user" },
  { label: t("types.inquiry") || "استفسار", value: "inquiry" },
  { label: t("types.issue") || "مشكلة", value: "issue" },
  { label: t("types.request") || "طلب", value: "request" },
  { label: t("types.suggestion") || "اقتراح", value: "suggestion" },
  { label: t("types.other") || "أخرى", value: "other" },
];

const SendTicketPopup = ({
  isOpen,
  onClose,
  onSuccess,
  editTicket = null,
  t,
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!editTicket;
  const complaintSchema = useMemo(() => getComplaintSchema(t), [t]);
  const complaintTypes = useMemo(() => getComplaintTypes(t), [t]);

  // React Query mutations
  const createMutation = useTicketMutation("createTicket");
  const updateMutation = useTicketMutation("updateTicket");

  const methods = useForm({
    resolver: zodResolver(complaintSchema),
    mode: "onChange",
    defaultValues: {
      subject: editTicket?.subject || "",
      complaintType: editTicket?.type || "",
      complaintText: editTicket?.message || "",
    },
  });

  const {
    handleSubmit,
    formState: { isValid },
    reset,
  } = methods;

  // Reset form when editTicket changes
  useEffect(() => {
    if (editTicket) {
      reset({
        subject: editTicket.subject || "",
        complaintType: editTicket.type,
        complaintText: editTicket.message,
      });
    } else {
      reset({
        subject: "",
        complaintType: "",
        complaintText: "",
      });
    }
  }, [editTicket, reset]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const ticketData = {
        subject: data.subject,
        type: data.complaintType,
        message: data.complaintText,
      };

      // Priority is only set on creation (non-admin cannot update it)
      if (!isEditMode) {
        ticketData.priority = data.priority || "medium";
      }

      let response;
      if (isEditMode) {
        response = await updateMutation.mutateAsync({
          ticketId: editTicket.id,
          data: ticketData,
        });
        toast.success(t("messages.updateSuccess") || "تم تحديث الشكوى بنجاح");
      } else {
        response = await createMutation.mutateAsync(ticketData);
        toast.success(t("messages.createSuccess") || "تم إرسال الشكوى بنجاح");
      }

      reset();
      onClose();

      if (onSuccess) {
        onSuccess(response?.data);
      }
    } catch (error) {
      console.error("Error saving ticket:", error);
      toast.error(
        error.message || t("messages.saveError") || "حدث خطأ أثناء حفظ الشكوى"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <PopupLayout isOpen={isOpen} onClose={handleCancel}>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.popup}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={handleCancel}
              aria-label="إغلاق"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 22L22 2"
                  stroke="#292D32"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 22L2 2"
                  stroke="#292D32"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h2 className={styles.title}>
              {isEditMode
                ? t("popup.editTitle") || "تعديل الشكوى"
                : t("popup.createTitle") || "انشئ شكوى"}
            </h2>
          </div>

          <div className={styles.content}>
            <div className={styles.inputWrapper}>
              <InputGroup
                label={t("popup.subjectLabel") || "موضوع الشكوى"}
                placeholder={t("popup.subjectPlaceholder") || "ادخل موضوع الشكوى"}
                name="subject"
                type="text"
                required
              />
            </div>

            <div className={styles.inputWrapper}>
              <InputSelect
                label={t("popup.typeLabel") || "نوع الشكوى"}
                placeholder={t("popup.typePlaceholder") || "اختر نوع الشكوى"}
                name="complaintType"
                options={complaintTypes}
                required
              />
            </div>

            <div className={styles.textareaWrapper}>
              <TextArea
                label={t("popup.messageLabel") || "الشكوى"}
                placeholder={t("popup.messagePlaceholder") || "ادخل نص الشكوى"}
                name="complaintText"
                required
              // rows={5}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              title={
                isSubmitting
                  ? isEditMode
                    ? t("popup.updating") || "جاري التحديث..."
                    : t("popup.submitting") || "جاري الإرسال..."
                  : isEditMode
                    ? t("popup.submitEdit") || "تحديث"
                    : t("popup.submitCreate") || "حفظ و ارسال"
              }
              disabled={!isValid || isSubmitting}
              className={styles.submitButton}
            />
            <Button
              type="button"
              variant="secondary"
              title={t("popup.cancel") || "الغاء"}
              onClick={handleCancel}
              className={styles.cancelButton}
            />
          </div>
        </form>
      </FormProvider>
    </PopupLayout>
  );
};

export default SendTicketPopup;
