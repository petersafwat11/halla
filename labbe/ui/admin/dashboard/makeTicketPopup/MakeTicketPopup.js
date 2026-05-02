"use client";
import React, { useState } from "react";
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
  TICKET_PRIORITY,
} from "@/utils/schemas/ticketSchema";
import { ticketsAPI } from "@/services/adminDashboard";
import { cookieUtils } from "@/utils/cookieUtils";
import MobileInputGroup from "@/ui/commen/inputs/mobileInputGroup/MobileInputGroup";

const MakeTicketPopup = ({ onClose, onSuccess }) => {
  const { t } = useTranslation("adminDashboard");
  const [isLoading, setIsLoading] = useState(false);

  // Type labels for display
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
    setIsLoading(true);
    try {
      const token = cookieUtils.getCookie("token");

      const response = await ticketsAPI.createTicket(data, token);

      console.log(response);
      toast.success(t("createTicket.success", "تم إنشاء الشكوى بنجاح"));

      onSuccess && onSuccess();
      onClose && onClose();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error(t("createTicket.error", "فشل في إنشاء الشكوى"));
    } finally {
      setIsLoading(false);
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
              name="username"
              control={control}
              render={({ field }) => (
                <InputGroup
                  label={t("createTicket.username", "اسم المستخدم")}
                  placeholder={t(
                    "createTicket.usernamePlaceholder",
                    "ادخل اسم المستخدم"
                  )}
                  type="text"
                  name="username"
                  hintMessage={errors.username?.message}
                  required={true}
                  error={!!errors.username}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="number"
              control={control}
              render={({ field }) => (
                <MobileInputGroup
                  label={t("createTicket.number", "رقم الهاتف")}
                  placeholder={t(
                    "createTicket.numberPlaceholder",
                    "5xx xxx xxx"
                  )}
                  type="tel"
                  name="number"
                  hintMessage={errors.number?.message}
                  required={true}
                  error={!!errors.number}
                  value={field.value}
                  onChange={field.onChange}
                />

                //   <InputGroup
                //     label={t("createTicket.number", "رقم الهاتف")}
                //     placeholder={t(
                //       "createTicket.numberPlaceholder",
                //       "+966 5xx xxx xxx"
                //     )}
                //     dir="ltr"
                //     type="text"
                //     name="number"
                //     hintMessage={errors.number?.message}
                //     required={true}
                //     error={!!errors.number}
                //     value={field.value}
                //     onChange={field.onChange}
                //   />
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
              disabled={isLoading}
            >
              {t("createTicket.cancel", "إلغاء")}
            </button>
            <button type="submit" className={styles.save} disabled={isLoading}>
              {isLoading
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
