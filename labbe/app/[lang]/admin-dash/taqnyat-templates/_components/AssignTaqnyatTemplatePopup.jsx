"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, FormProvider, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useAssignTaqnyat } from "@/hooks/queries/useTaqnyatTemplates";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { assignTaqnyatSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import ToggelInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import SearchableSelect from "@/ui/commen/inputs/SearchableSelect/SearchableSelect";
import styles from "./AssignTaqnyatTemplatePopup.module.css";

const SOURCE_KEY_OPTIONS = [
  { value: "guest.name", label: "guest.name (الضيف)" },
  { value: "eventDetails.title", label: "eventDetails.title (عنوان الحدث)" },
  { value: "eventDetails.dateFormatted", label: "eventDetails.dateFormatted (التاريخ)" },
  { value: "eventDetails.time", label: "eventDetails.time (الوقت)" },
  { value: "eventDetails.location.address", label: "eventDetails.location.address (العنوان)" },
  { value: "host.name", label: "host.name (المضيف)" },
  { value: "hostNote", label: "hostNote (ملاحظة المضيف)" },
  { value: "invitationMessage", label: "invitationMessage (رسالة الدعوة)" },
];

function detectPlaceholders(bodyText) {
  if (!bodyText) return [];
  const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
  const seen = new Set();
  return matches.filter((m) => (seen.has(m) ? false : seen.add(m)));
}

function VarMappingField({ name, index, control }) {
  const { t } = useTranslation("admin");
  const { field: sourceField } = useController({ name: `${name}.sourceKey`, control });
  const { field: fallbackField } = useController({ name: `${name}.fallback`, control });
  const placeholder = useController({ name: `${name}.placeholder`, control }).field.value;

  return (
    <div className={styles.mappingRow}>
      <span className={styles.placeholder}>{placeholder}</span>
      <div className={styles.mappingSelectWrapper}>
        <select
          value={sourceField.value}
          onChange={sourceField.onChange}
          className={styles.mappingSelect}
        >
          <option value="">— {t("taqnyat.pickSource", "اختر المصدر")} —</option>
          {SOURCE_KEY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <input
        type="text"
        placeholder={t("taqnyat.fallback", "قيمة بديلة")}
        value={fallbackField.value}
        onChange={fallbackField.onChange}
        className={styles.mappingInput}
      />
    </div>
  );
}

function CategorySelect({ label, options, placeholder, control }) {
  const { field } = useController({ name: "category", control });

  return (
    <SearchableSelect
      label={label}
      value={field.value}
      onChange={field.onChange}
      options={options}
      placeholder={placeholder}
    />
  );
}

export default function AssignTaqnyatTemplatePopup({ template, categories, onClose, lang }) {
  const { t } = useTranslation("admin");
  const assign = useAssignTaqnyat();

  const placeholders = useMemo(() => detectPlaceholders(template.bodyText), [template.bodyText]);

  const categoryOptions = useMemo(() => {
    return [
      { value: "", label: t("taqnyat.unassigned", "غير معين") },
      ...categories.map((c) => ({
        value: c.code,
        label: lang === "ar" ? c.nameAr : c.nameEn,
      })),
    ];
  }, [categories, lang, t]);

  const initialMapping = useMemo(() => {
    const byPlaceholder = Object.fromEntries(
      (template.varMapping || []).map((m) => [m.placeholder, m])
    );
    return placeholders.map(
      (ph) => byPlaceholder[ph] || { placeholder: ph, sourceKey: "", fallback: "" }
    );
  }, [placeholders, template.varMapping]);

  const methods = useForm({
    resolver: zodResolver(assignTaqnyatSchema),
    defaultValues: {
      category: template.category || "",
      active: template.active !== false,
      sortOrder: template.sortOrder || 0,
      varMapping: initialMapping,
    },
  });

  useEffect(() => {
    methods.reset({
      category: template.category || "",
      active: template.active !== false,
      sortOrder: template.sortOrder || 0,
      varMapping: initialMapping,
    });
  }, [template, initialMapping, methods]);

  const onSubmit = async (data) => {
    const cleaned = data.varMapping.filter((m) => m.sourceKey);
    try {
      await assign.mutateAsync({
        id: template._id,
        body: {
          category: data.category || null,
          active: data.active,
          sortOrder: data.sortOrder,
          varMapping: cleaned,
        },
      });
      toastUtils.success(t("taqnyat.saved", "تم الحفظ بنجاح"));
      onClose();
    } catch (err) {
      handleError(err, t, { fallbackMessage: "taqnyat.saved" });
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{template.templateName}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {template.bodyText && (
          <div className={styles.bodyPreview}>{template.bodyText}</div>
        )}

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <CategorySelect
              label={t("taqnyat.fieldCategory", "الفئة")}
              options={categoryOptions}
              placeholder={t("taqnyat.selectCategory", "اختر الفئة")}
              control={methods.control}
            />

            <h3 className={styles.varMappingTitle}>{t("taqnyat.varMapping", "تعيين المتغيرات")}</h3>

            {placeholders.length === 0 ? (
              <p className={styles.noPlaceholders}>{t("taqnyat.noPlaceholders", "لا توجد متغيرات")}</p>
            ) : (
              placeholders.map((_, idx) => (
                <VarMappingField
                  key={`mapping-${idx}`}
                  name={`varMapping.${idx}`}
                  index={idx}
                  control={methods.control}
                />
              ))
            )}

            <div className={styles.settingsRow}>
              <div className={styles.toggleWrapper}>
                <ToggelInput name="active" label={t("taqnyat.active", "نشط")} />
              </div>
              <div className={styles.sortOrderWrapper}>
                <InputGroup
                  label={t("taqnyat.sortOrder", "ترتيب العرض")}
                  type="number"
                  name="sortOrder"
                />
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("cancel", "إلغاء")}
                onClick={onClose}
                disabled={assign.isPending}
              />
              <Button
                variant="primary"
                title={assign.isPending ? t("common.loading", "جاري الحفظ...") : t("save", "حفظ")}
                type="submit"
                disabled={assign.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
