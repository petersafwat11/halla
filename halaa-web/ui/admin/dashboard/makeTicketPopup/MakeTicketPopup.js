"use client";
import React from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import styles from "./makeTicketPopup.module.css";
import Image from "next/image";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import {
  createTicketSchema,
  TICKET_TYPES,
} from "@halla/shared/schemas/tickets";
import { useTicketMutation } from "@/hooks/tickets";

const MakeTicketPopup = ({ onClose, onSuccess }) => {
  const { t } = useTranslation("adminDashboard");
  const createMutation = useTicketMutation("createTicket");

  const typeLabels = {
    technical: t("ticketTypes.technical", "تقني"),
    payment: t("ticketTypes.payment", "دفع"),
    event: t("ticketTypes.event", "مناسبة"),
    user: t("ticketTypes.user", "مستخدم"),
    other: t("ticketTypes.other", "أخرى"),
    inquiry: t("ticketTypes.inquiry", "استفسار"),
    issue: t("ticketTypes.issue", "مشكلة"),
    request: t("ticketTypes.request", "طلب"),
    suggestion: t("ticketTypes.suggestion", "اقتراح"),
  };

  const methods = useForm({
    resolver: zodResolver(createTicketSchema(t)),
    defaultValues: {
      subject: "",
      type: "other",
      message: "",
      priority: "medium",
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = methods;

  const onSubmit = async (data) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success(t("createTicket.success", "تم إنشاء الشكوى بنجاح"));
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(t("createTicket.error", "فشل في إنشاء الشكوى"));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>
          {t("createTicket.title", "إنشاء شكوى دعم")}
        </h2>
        <button onClick={onClose} className={styles.closeButton}>
          <Image
            width={24}
            height={24}
            src="/svg/admin/close.svg"
            alt="close"
          />
        </button>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.body}>
          <div className={styles.inputsWrapper}>
            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <InputGroup
                  label={t("createTicket.subject", "عنوان الشكوى")}
                  placeholder={t(
                    "createTicket.subjectPlaceholder",
                    "ادخل عنوان الشكوى"
                  )}
                  type="text"
                  name="subject"
                  hintMessage={errors.subject?.message}
                  required={true}
                  error={!!errors.subject}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <div className={styles.selectGroup}>
              <div className={styles.selectHeader}>
                <p>{t("createTicket.type", "نوع الشكوى")}</p>
                {errors.type && (
                  <span className={styles.error}>{errors.type.message}</span>
                )}
              </div>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`${styles.select} ${errors.type ? styles.selectError : ""
                      }`}
                  >
                    {TICKET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {typeLabels[type] || type}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
          <div className={styles.messageGroup}>
            <div className={styles.messageHeader}>
              <p>{t("createTicket.message", "الرسالة")}</p>
              {errors.message && (
                <span className={styles.error}>{errors.message.message}</span>
              )}
            </div>
            <Controller
              name="message"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`${styles.textarea} ${errors.message ? styles.textareaError : ""
                    }`}
                  placeholder={t(
                    "createTicket.messagePlaceholder",
                    "اكتب رسالتك هنا..."
                  )}
                  rows={5}
                />
              )}
            />
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancel}
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              {t("createTicket.cancel", "إلغاء")}
            </button>
            <button type="submit" className={styles.save} disabled={createMutation.isPending}>
              {createMutation.isPending
                ? t("createTicket.creating", "جاري الإنشاء...")
                : t("createTicket.create", "إنشاء")}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default MakeTicketPopup;
