"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useCreateTaqnyatTemplate } from "@/hooks/taqnyatTemplates";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { createTaqnyatTemplateSchema } from "@halaa/shared/schemas/admin";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import { detectPlaceholders } from "../_utils/detectPlaceholders";
import styles from "./CreateTaqnyatTemplatePopup.module.css";

export default function CreateTaqnyatTemplatePopup({ onClose }) {
  const { t } = useTranslation("admin");
  const create = useCreateTaqnyatTemplate();

  const methods = useForm({
    resolver: zodResolver(createTaqnyatTemplateSchema),
    defaultValues: {
      name: "",
      category: "UTILITY",
      language: "ar",
      headerText: "",
      bodyText: "",
      footerText: "",
      bodyExamples: [],
    },
  });

  // Track body changes so the per-placeholder example inputs render in
  // sync with the body text the admin is typing.
  const bodyText = useWatch({ control: methods.control, name: "bodyText" });
  const placeholders = useMemo(() => detectPlaceholders(bodyText || ""), [bodyText]);

  // Resize the bodyExamples array when placeholders change so resolver
  // validation stays in sync.
  useEffect(() => {
    const current = methods.getValues("bodyExamples") || [];
    const next = placeholders.map((_, i) => current[i] || "");
    if (next.length !== current.length) {
      methods.setValue("bodyExamples", next, { shouldValidate: false });
    }
  }, [placeholders, methods]);

  const onSubmit = async (data) => {
    try {
      await create.mutateAsync({
        name: data.name.trim(),
        category: data.category,
        language: data.language,
        headerText: data.headerText?.trim() || undefined,
        bodyText: data.bodyText,
        bodyExamples: data.bodyExamples,
        footerText: data.footerText?.trim() || undefined,
      });
      toastUtils.success(
        t("taqnyat.createSubmitted", "تم إرسال القالب لمراجعة Meta")
      );
      onClose();
    } catch (err) {
      handleError(err, t, { fallbackMessage: "taqnyat.createFailed" });
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("taqnyat.createTitle", "إنشاء قالب جديد")}</h2>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            ×
          </button>
        </div>

        <p className={styles.note}>
          {t(
            "taqnyat.createNote",
            "سيتم إرسال القالب إلى Meta للمراجعة. عادةً 24-48 ساعة حتى الموافقة."
          )}
        </p>

        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className={styles.form}
            noValidate
          >
            <InputGroup
              label={t("taqnyat.fieldName", "الاسم (snake_case)")}
              type="text"
              name="name"
              placeholder="halaa_invitation_v3"
              required
            />

            <div className={styles.row}>
              <div className={styles.selectGroup}>
                <label>{t("taqnyat.fieldCategory", "الفئة")} *</label>
                <select
                  className={styles.select}
                  {...methods.register("category")}
                >
                  <option value="UTILITY">UTILITY</option>
                  <option value="MARKETING">MARKETING</option>
                  <option value="AUTHENTICATION">AUTHENTICATION</option>
                </select>
              </div>
              <div className={styles.selectGroup}>
                <label>{t("taqnyat.fieldLanguage", "اللغة")} *</label>
                <select
                  className={styles.select}
                  {...methods.register("language")}
                >
                  <option value="ar">العربية (ar)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>
            </div>

            <InputGroup
              label={t("taqnyat.fieldHeaderText", "عنوان (اختياري)")}
              type="text"
              name="headerText"
              maxLength={60}
            />

            <TextArea
              label={t("taqnyat.fieldBody", "نص الرسالة")}
              name="bodyText"
              rows={6}
              required
              maxLength={1024}
              placeholder="مرحباً {{1}}! أنت مدعو إلى {{2}} يوم {{3}}"
            />

            {placeholders.length > 0 && (
              <div className={styles.examplesBlock}>
                <label className={styles.examplesLabel}>
                  {t(
                    "taqnyat.fieldExamples",
                    "أمثلة لكل متغير (مطلوب من Meta)"
                  )}
                </label>
                {placeholders.map((ph, i) => (
                  <div key={ph} className={styles.exampleRow}>
                    <span className={styles.placeholder}>{ph}</span>
                    <input
                      type="text"
                      className={styles.exampleInput}
                      placeholder={t("taqnyat.exampleValue", "مثال")}
                      {...methods.register(`bodyExamples.${i}`)}
                    />
                  </div>
                ))}
                {methods.formState.errors.bodyExamples?.message && (
                  <p className={styles.error}>
                    {methods.formState.errors.bodyExamples.message}
                  </p>
                )}
              </div>
            )}

            <InputGroup
              label={t("taqnyat.fieldFooter", "تذييل (اختياري)")}
              type="text"
              name="footerText"
              maxLength={60}
            />

            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("cancel", "إلغاء")}
                onClick={onClose}
                disabled={create.isPending}
              />
              <Button
                variant="primary"
                title={
                  create.isPending
                    ? t("common.loading", "جاري الإرسال...")
                    : t("taqnyat.submit", "إرسال للمراجعة")
                }
                type="submit"
                disabled={create.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
