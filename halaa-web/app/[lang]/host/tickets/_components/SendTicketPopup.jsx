"use client";
import React, { useState, useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./SendTicketPopup.module.css";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import MediaAttachmentInput from "@/ui/commen/inputs/uploadFile/MediaAttachmentInput";
import Button from "@/ui/commen/button/Button";
import {
  createTicketSchema,
  updateTicketSchema,
  TICKET_TYPES,
  getCreateTicketDefaults,
} from "@halaa/shared/schemas/tickets";
import { useTicketMutation } from "@/hooks/tickets";
import { toast } from "react-toastify";

const buildTypeOptions = (t) =>
  TICKET_TYPES.map((value) => ({
    value,
    label: t(`types.${value}`) || value,
  }));

const SendTicketPopup = ({
  isOpen,
  onClose,
  onSuccess,
  editTicket = null,
  t,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Optional attachment (image OR video) — held outside react-hook-form since
  // it is a File, not a JSON value. Only used when creating a ticket.
  const [attachment, setAttachment] = useState(null);
  const isEditMode = !!editTicket;

  const schema = useMemo(
    () => (isEditMode ? updateTicketSchema(t) : createTicketSchema(t)),
    [t, isEditMode]
  );
  const typeOptions = useMemo(() => buildTypeOptions(t), [t]);

  const createMutation = useTicketMutation("createTicket");
  const updateMutation = useTicketMutation("updateTicket");

  const methods = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: editTicket
      ? {
          subject: editTicket.subject || "",
          type: editTicket.type || "",
          message: editTicket.message || "",
        }
      : getCreateTicketDefaults(),
  });

  const {
    handleSubmit,
    formState: { isValid },
    reset,
  } = methods;

  useEffect(() => {
    if (editTicket) {
      reset({
        subject: editTicket.subject || "",
        type: editTicket.type || "",
        message: editTicket.message || "",
      });
    } else {
      reset(getCreateTicketDefaults());
    }
  }, [editTicket, reset]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      let response;
      if (isEditMode) {
        response = await updateMutation.mutateAsync({
          ticketId: editTicket.id,
          data,
        });
        toast.success(t("messages.updateSuccess"));
      } else {
        // When an attachment is present, send multipart/form-data; otherwise
        // keep the plain JSON path. apiRequest auto-switches on FormData.
        let payload = data;
        if (attachment) {
          const formData = new FormData();
          formData.append("subject", data.subject);
          formData.append("type", data.type);
          formData.append("message", data.message);
          if (data.priority) formData.append("priority", data.priority);
          formData.append("ticketAttachment", attachment);
          payload = formData;
        }
        response = await createMutation.mutateAsync(payload);
        toast.success(t("messages.createSuccess"));
      }

      reset();
      setAttachment(null);
      onClose();
      onSuccess?.(response?.data);
    } catch (error) {
      console.error("Error saving ticket:", error);
      toast.error(error.message || t("messages.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    setAttachment(null);
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
              aria-label={t("popup.cancel")}
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
              {isEditMode ? t("popup.editTitle") : t("popup.createTitle")}
            </h2>
          </div>

          <div className={styles.content}>
            <div className={styles.inputWrapper}>
              <InputGroup
                label={t("popup.subjectLabel")}
                placeholder={t("popup.subjectPlaceholder")}
                name="subject"
                type="text"
                required
              />
            </div>

            <div className={styles.inputWrapper}>
              <InputSelect
                label={t("popup.typeLabel")}
                placeholder={t("popup.typePlaceholder")}
                name="type"
                options={typeOptions}
                required
              />
            </div>

            <div className={styles.textareaWrapper}>
              <TextArea
                label={t("popup.messageLabel")}
                placeholder={t("popup.messagePlaceholder")}
                name="message"
                required
              />
            </div>

            {!isEditMode && (
              <div className={styles.inputWrapper}>
                <MediaAttachmentInput
                  t={t}
                  label={t("popup.attachmentLabel")}
                  value={attachment}
                  onChange={setAttachment}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              title={
                isSubmitting
                  ? isEditMode
                    ? t("popup.updating")
                    : t("popup.submitting")
                  : isEditMode
                    ? t("popup.submitEdit")
                    : t("popup.submitCreate")
              }
              disabled={!isValid || isSubmitting}
              className={styles.submitButton}
            />
            <Button
              type="button"
              variant="secondary"
              title={t("popup.cancel")}
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
