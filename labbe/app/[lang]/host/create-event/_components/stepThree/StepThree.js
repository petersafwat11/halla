"use client";
/**
 * StepThree (visual template) — backend-driven thumbnail grid; selecting
 * a thumbnail opens TemplateForm, which renders the dynamic fields and
 * bakes the canvas into an image at save.
 */

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepThree.module.css";
import TemplatesCards from "./templatesCards/TemplatesCards";
import TemplateForm from "../templateForm/TemplateForm";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useHostTemplates, useTemplateCategories } from "@/hooks/queries/useTemplates";

const StepThree = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");
  const { currentLocale } = UseLanguageChange();

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  const { data: catData } = useTemplateCategories({ admin: false });
  const { data: tplData, isLoading } = useHostTemplates({
    category: selectedCategory,
  });
  const categories = catData?.data?.categories || [];
  const templates = tplData?.data?.templates || [];

  const templateImage = watch("templateImage");
  const visualTemplate = watch("visualTemplate");

  const selectedRef =
    visualTemplate?.templateRef || visualTemplate?._id || visualTemplate?.id;
  const checkedTemplate =
    templates.find((tpl) => tpl._id === selectedRef) ||
    templates.find(
      (tpl) => (tpl.thumbnailUrl || tpl.imageUrl) === templateImage
    ) ||
    null;

  const handleTemplateSelect = (template) => {
    const existingValues =
      visualTemplate &&
      (visualTemplate.templateRef === template._id ||
        visualTemplate._id === template._id)
        ? visualTemplate.fieldValues || visualTemplate.data
        : null;
    setActiveTemplate({
      ...template,
      fieldValues: existingValues || {},
      data: existingValues || {},
    });
    setShowTemplateForm(true);
  };

  const handleSetEventValues = (key, value) => {
    if (
      key === "selectedTemplate" ||
      key === "invitationSettings.selectedTemplate"
    ) {
      const next = {
        ...value,
        templateRef: value?._id || value?.templateRef,
        fieldValues: value?.fieldValues || value?.data || {},
      };
      setValue("visualTemplate", next, { shouldValidate: false });
      setValue("invitationSettings.visualTemplate", next, {
        shouldValidate: false,
      });
      return;
    }
    if (key === "invitationSettings.templateImage") {
      setValue("templateImage", value, { shouldValidate: true });
      setValue("invitationSettings.templateImage", value, {
        shouldValidate: false,
      });
      return;
    }
    setValue(key, value, { shouldValidate: key === "templateImage" });
  };

  return (
    <div className={styles.stepThree}>
      <div className={styles.templateSection}>
        <label className={styles.sectionLabel}>{t("select_template")}</label>

        {categories.length > 0 && (
          <div className={styles.categoryChips}>
            <button
              type="button"
              onClick={() => setSelectedCategory("")}
              className={`${styles.categoryChip} ${
                selectedCategory === "" ? styles.categoryChipActive : ""
              }`}
            >
              {t("all_categories", "كل الفئات")}
            </button>
            {categories.map((c) => (
              <button
                key={c._id || c.code}
                type="button"
                onClick={() => setSelectedCategory(c.code)}
                className={`${styles.categoryChip} ${
                  selectedCategory === c.code ? styles.categoryChipActive : ""
                }`}
              >
                {currentLocale === "ar" ? c.nameAr : c.nameEn}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <SimpleLoading />
        ) : templates.length === 0 ? (
          <p className={styles.emptyMessage}>
            {t(
              "no_templates_available",
              "لا توجد قوالب متاحة بعد. تواصل مع الدعم."
            )}
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
              height:
                tpl.naturalHeight && tpl.naturalWidth
                  ? Math.round((tpl.naturalHeight / tpl.naturalWidth) * 100)
                  : 120,
            }))}
            selectedTemplate={checkedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />
        )}
        {checkedTemplate && (
          <p className={styles.selectedLabel}>
            {t("selected_template")}:{" "}
            <span className={styles.selectedName}>
              {currentLocale === "ar"
                ? checkedTemplate.nameAr
                : checkedTemplate.nameEn}
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
