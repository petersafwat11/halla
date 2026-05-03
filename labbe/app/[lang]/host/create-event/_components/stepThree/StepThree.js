"use client";
/**
 * StepThree (visual template) — Phase 4c W1-VISUAL
 *
 * Replaces the hardcoded 3-template array with a backend-driven
 * thumbnail grid (filtered by category once that selector lands in
 * StepOne / a dedicated picker). Selecting a thumbnail opens
 * `TemplateForm`, which renders the dynamic fields from
 * `template.fields[]` and bakes the canvas into a baked image at save.
 *
 * Form context contract (preserved from prior version + extended for
 * Phase 4c W0-RENAME canonical names):
 *   - templateImage:                File (the baked PNG/Blob)
 *   - visualTemplate:               full Template doc + .data (legacy
 *                                    field name kept for compat) and
 *                                    .fieldValues (canonical) and
 *                                    .templateRef (canonical id)
 *   - invitationSettings.visualTemplate: legacy mirror (dual-write)
 *   - invitationSettings.templateImage:  legacy mirror (dual-write)
 */

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepThree.module.css";
import TemplatesCards from "./templatesCards/TemplatesCards";
import TemplateForm from "../templateForm/TemplateForm";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import { useHostTemplates, useTemplateCategories } from "@/hooks/queries/useTemplates";

const StepThree = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");
  const { currentLocale } = UseLanguageChange();

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  const { data: catData } = useTemplateCategories({ admin: false });
  const { data: tplData, isLoading } = useHostTemplates({ category: selectedCategory });
  const categories = catData?.data?.categories || catData?.categories || [];
  const templates = tplData?.data?.templates || tplData?.templates || [];

  // templateImage stores the generated File (after TemplateForm) or
  // thumbnailUrl (before customization)
  const templateImage = watch("templateImage");
  const visualTemplate = watch("visualTemplate");

  // Derive which card is checked: match by templateRef → backend _id.
  const selectedRef =
    visualTemplate?.templateRef || visualTemplate?._id || visualTemplate?.id;
  const checkedTemplate =
    templates.find((tpl) => tpl._id === selectedRef) ||
    templates.find((tpl) => (tpl.thumbnailUrl || tpl.imageUrl) === templateImage) ||
    null;

  const handleTemplateSelect = (template) => {
    // Pass through saved field values when re-selecting the same template.
    const existingValues =
      visualTemplate && (visualTemplate.templateRef === template._id || visualTemplate._id === template._id)
        ? visualTemplate.fieldValues || visualTemplate.data
        : null;
    setActiveTemplate({
      ...template,
      // Preserve both naming conventions during dual-write window
      fieldValues: existingValues || {},
      data: existingValues || {},
    });
    setShowTemplateForm(true);
  };

  // setEventValues from TemplateForm — dual-writes legacy + canonical keys
  const handleSetEventValues = (key, value) => {
    if (key === "selectedTemplate" || key === "invitationSettings.selectedTemplate") {
      // Save the visual template with both naming conventions
      const next = {
        ...value,
        templateRef: value?._id || value?.templateRef,
        fieldValues: value?.fieldValues || value?.data || {},
      };
      setValue("visualTemplate", next, { shouldValidate: false });
      setValue("invitationSettings.visualTemplate", next, { shouldValidate: false });
      return;
    }
    if (key === "invitationSettings.templateImage") {
      setValue("templateImage", value, { shouldValidate: true });
      setValue("invitationSettings.templateImage", value, { shouldValidate: false });
      return;
    }
    setValue(key, value, { shouldValidate: key === "templateImage" });
  };

  return (
    <div className={styles.stepThree}>
      <div className={styles.templateSection}>
        <label className={styles.sectionLabel}>{t("select_template")}</label>

        {categories.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setSelectedCategory("")}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: selectedCategory === "" ? "2px solid #c28e5c" : "1px solid #ddd",
                background: selectedCategory === "" ? "#fff7eb" : "#fff",
                cursor: "pointer",
              }}
            >
              {t("all_categories", "كل الفئات")}
            </button>
            {categories.map((c) => (
              <button
                key={c._id || c.code}
                type="button"
                onClick={() => setSelectedCategory(c.code)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: selectedCategory === c.code ? "2px solid #c28e5c" : "1px solid #ddd",
                  background: selectedCategory === c.code ? "#fff7eb" : "#fff",
                  cursor: "pointer",
                }}
              >
                {currentLocale === "ar" ? c.nameAr : c.nameEn}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <p>{t("loading", "...")}</p>
        ) : templates.length === 0 ? (
          <p style={{ color: "#666" }}>
            {t("no_templates_available", "لا توجد قوالب متاحة بعد. تواصل مع الدعم.")}
          </p>
        ) : (
          <TemplatesCards
            templates={templates.map((tpl) => ({
              id: tpl._id,
              _id: tpl._id,
              name: currentLocale === "ar" ? tpl.nameAr : tpl.nameEn,
              src: tpl.thumbnailUrl || tpl.imageUrl,
              imageUrl: tpl.imageUrl,
              thumbnailUrl: tpl.thumbnailUrl,
              naturalWidth: tpl.naturalWidth,
              naturalHeight: tpl.naturalHeight,
              fields: tpl.fields,
              overlays: tpl.overlays,
              decorations: tpl.decorations,
              categories: tpl.categories,
              width: 100,
              height: tpl.naturalHeight && tpl.naturalWidth ? Math.round((tpl.naturalHeight / tpl.naturalWidth) * 100) : 120,
            }))}
            selectedTemplate={checkedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />
        )}
        {checkedTemplate && (
          <p className={styles.selectedLabel}>
            {t("selected_template")}:{" "}
            <span style={{ color: "#2a8c5b", fontWeight: 600 }}>
              {currentLocale === "ar" ? checkedTemplate.nameAr : checkedTemplate.nameEn}
            </span>
          </p>
        )}
      </div>

      <TemplateForm
        isOpen={showTemplateForm}
        onClose={() => setShowTemplateForm(false)}
        locale={currentLocale}
        setEventValues={handleSetEventValues}
        template={activeTemplate || visualTemplate}
      />
    </div>
  );
};

export default StepThree;
