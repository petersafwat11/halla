"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, FormProvider, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useAssignTaqnyat } from "@/hooks/taqnyatTemplates";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { assignTaqnyatSchema } from "@halaa/shared/schemas/admin";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import ToggelInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import SearchableSelect from "@/ui/commen/inputs/SearchableSelect/SearchableSelect";
import { detectPlaceholders } from "../_utils/detectPlaceholders";
import styles from "./AssignTaqnyatTemplatePopup.module.css";

const SOURCE_KEYS = [
  "guest.name",
  "eventDetails.title",
  "eventDetails.dayFormatted",
  "eventDetails.dateFormatted",
  "eventDetails.time",
  "eventDetails.location.address",
  "eventDetails.location.mapUrl",
  "host.name",
  "staff.name",
  "staff.accessUrl",
  "hostNote",
  "invitationMessage",
];

const SOURCE_KEY_LABEL_KEY = {
  "guest.name": "taqnyat.sourceKeys.guest_name",
  "eventDetails.title": "taqnyat.sourceKeys.event_title",
  "eventDetails.dayFormatted": "taqnyat.sourceKeys.event_dayFormatted",
  "eventDetails.dateFormatted": "taqnyat.sourceKeys.event_dateFormatted",
  "eventDetails.time": "taqnyat.sourceKeys.event_time",
  "eventDetails.location.address": "taqnyat.sourceKeys.event_location",
  "eventDetails.location.mapUrl": "taqnyat.sourceKeys.event_mapUrl",
  "host.name": "taqnyat.sourceKeys.host_name",
  "staff.name": "taqnyat.sourceKeys.staff_name",
  "staff.accessUrl": "taqnyat.sourceKeys.staff_accessUrl",
  hostNote: "taqnyat.sourceKeys.hostNote",
  invitationMessage: "taqnyat.sourceKeys.invitationMessage",
};

const TEMPLATE_TYPES = [
  "invite",
  "reminder_confirmed",
  "post_event",
  "staff_access",
];

const INVITATION_MODES = ["reply_and_qr", "reply_only", "none"];

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
          {SOURCE_KEYS.map((key) => (
            <option key={key} value={key}>
              {key} — {t(SOURCE_KEY_LABEL_KEY[key], key)}
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

  const initialInvitationMode =
    template.invitationMode || (template.type === "invite" ? "reply_and_qr" : "");
  const compatibleModes = template.buttonCapability?.compatibleInvitationModes ||
    (template.invitationModeLegacy ? ["reply_and_qr"] : []);

  const methods = useForm({
    resolver: zodResolver(assignTaqnyatSchema),
    defaultValues: {
      category: template.category || "",
      type: template.type || "",
      invitationMode: initialInvitationMode,
      active: template.active !== false,
      sortOrder: template.sortOrder || 0,
      varMapping: initialMapping,
    },
  });

  const selectedType = methods.watch("type");
  const selectedInvitationMode = methods.watch("invitationMode");
  const modeMismatch =
    selectedType === "invite" &&
    Boolean(template.buttonCapability || template.invitationModeLegacy) &&
    !compatibleModes.includes(selectedInvitationMode);

  useEffect(() => {
    methods.reset({
      category: template.category || "",
      type: template.type || "",
      invitationMode: initialInvitationMode,
      active: template.active !== false,
      sortOrder: template.sortOrder || 0,
      varMapping: initialMapping,
    });
  }, [template, initialMapping, initialInvitationMode, methods]);

  useEffect(() => {
    if (selectedType === "invite" && !methods.getValues("invitationMode")) {
      methods.setValue("invitationMode", "reply_and_qr");
    }
    if (selectedType !== "invite" && methods.getValues("invitationMode")) {
      methods.setValue("invitationMode", "");
    }
  }, [selectedType, methods]);

  const onSubmit = async (data) => {
    const cleaned = data.varMapping.filter((m) => m.sourceKey);
    try {
      await assign.mutateAsync({
        id: template._id,
        body: {
          category: data.category || null,
          type: data.type || null,
          invitationMode: data.type === "invite" ? data.invitationMode : null,
          active: data.active,
          sortOrder: data.sortOrder,
          varMapping: cleaned,
        },
      });
      toastUtils.success(t("taqnyat.saved", "تم الحفظ بنجاح"));
      onClose();
    } catch (err) {
      handleError(err, t, { fallbackMessage: "taqnyat.saveFailed" });
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

            <div className={styles.typeField}>
              <label className={styles.typeLabel}>
                {t("taqnyat.fieldType", "نوع القالب")}
              </label>
              <select
                {...methods.register("type")}
                className={styles.typeSelect}
              >
                <option value="">
                  {t("taqnyat.unassignedType", "غير معيّن")}
                </option>
                {TEMPLATE_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {t(`taqnyat.types.${tp}`, tp)}
                  </option>
                ))}
              </select>
              {selectedType && selectedType !== "invite" && (
                <p className={styles.typeHint}>
                  {t(
                    "taqnyat.uniquePerCategoryHint",
                    "يُسمح بقالب واحد نشط فقط لكل فئة لهذا النوع. الحفظ سيُلغي تفعيل السابق."
                  )}
                </p>
              )}
            </div>

            {selectedType === "invite" && (
              <div className={styles.modeField}>
                <label className={styles.typeLabel}>
                  {t("taqnyat.fieldInvitationMode", "Invitation mode")}
                </label>
                <select
                  {...methods.register("invitationMode")}
                  className={styles.typeSelect}
                >
                  {INVITATION_MODES.map((mode) => (
                    <option
                      key={mode}
                      value={mode}
                      disabled={
                        Boolean(template.buttonCapability || template.invitationModeLegacy) &&
                        !compatibleModes.includes(mode)
                      }
                    >
                      {t(`taqnyat.invitationModes.${mode}`, mode)}
                    </option>
                  ))}
                </select>
                <div className={styles.capabilityCard}>
                  <strong>{t("taqnyat.detectedControls", "Detected WhatsApp controls")}</strong>
                  <span>
                    {t(
                      `taqnyat.buttonCapabilities.${template.buttonCapability?.kind || "unverified"}`,
                      template.buttonCapability?.kind || "unverified"
                    )}
                  </span>
                  {template.invitationModeLegacy && (
                    <small>
                      {t(
                        "taqnyat.legacyModeHint",
                        "Legacy assignment: saving keeps this template on Reply + QR until changed."
                      )}
                    </small>
                  )}
                  {modeMismatch && (
                    <small className={styles.capabilityError}>
                      {t(
                        "taqnyat.modeMismatch",
                        "This template cannot be assigned to the selected mode."
                      )}
                    </small>
                  )}
                </div>
              </div>
            )}

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
                disabled={assign.isPending || modeMismatch}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
