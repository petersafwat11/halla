"use client";
/**
 * StepThree (visual template) — backend-driven thumbnail grid; selecting
 * a thumbnail opens TemplateForm, which renders the dynamic fields and
 * bakes the canvas into an image at save.
 */

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FaCheckCircle } from "react-icons/fa";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepThree.module.css";
import TemplateForm from "../templateForm/TemplateForm";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  useHostTemplates,
  useTemplateCategories,
} from "@/hooks/queries/useTemplates";

const StepThree = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");
  const { currentLocale } = UseLanguageChange();
  const isAr = currentLocale === "ar";

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const isMobile = useMediaQuery("(max-width: 550px)");
  const isTablet = useMediaQuery("(max-width: 768px)");
  const itemsPerPage = isMobile ? 3 : isTablet ? 4 : 4;

  const { data: catData } = useTemplateCategories({ admin: false });
  const { data: tplData, isLoading } = useHostTemplates({
    category: selectedCategory,
  });
  const categories = catData?.data?.categories || [];
  const templates = useMemo(
    () => tplData?.data?.templates || [],
    [tplData],
  );

  const templateImage = watch("templateImage");
  const visualTemplate = watch("visualTemplate");

  const selectedRef =
    visualTemplate?.templateRef || visualTemplate?._id || visualTemplate?.id;
  const checkedTemplate =
    templates.find((tpl) => tpl._id === selectedRef) ||
    templates.find(
      (tpl) => (tpl.thumbnailUrl || tpl.imageUrl) === templateImage,
    ) ||
    null;

  const totalPages = Math.max(1, Math.ceil(templates.length / itemsPerPage));
  const startIndex = currentPage * itemsPerPage;
  const currentTemplates = templates.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [isMobile, isTablet, selectedCategory, templates.length]);

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
    if (key === "selectedTemplate") {
      const next = {
        ...value,
        templateRef: value?._id || value?.templateRef,
        fieldValues: value?.fieldValues || value?.data || {},
      };
      setValue("visualTemplate", next, { shouldValidate: false });
      return;
    }
    setValue(key, value, { shouldValidate: key === "templateImage" });
  };

  return (
    <div className={styles.stepThree}>
      <div className={styles.templateSection}>
        <label className={styles.sectionLabel}>{t("select_template")}</label>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${
              selectedCategory === "" ? styles.active : ""
            }`}
            onClick={() => setSelectedCategory("")}
          >
            {t("all_categories", isAr ? "كل الفئات" : "All categories")}
          </button>
          {categories.map((c) => (
            <button
              key={c._id || c.code}
              type="button"
              className={`${styles.tab} ${
                selectedCategory === c.code ? styles.active : ""
              }`}
              onClick={() => setSelectedCategory(c.code)}
            >
              {isAr ? c.nameAr : c.nameEn}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SimpleLoading />
        ) : templates.length === 0 ? (
          <p className={styles.emptyMessage}>
            {t(
              "no_templates_available",
              isAr
                ? "لا توجد قوالب متاحة بعد. تواصل مع الدعم."
                : "No templates available yet.",
            )}
          </p>
        ) : (
          <div className={styles.templatesGrid}>
            {currentTemplates.map((tpl) => {
              const src = tpl.thumbnailUrl || tpl.imageUrl;
              const alt = isAr ? tpl.nameAr : tpl.nameEn;
              const isSelected = checkedTemplate?._id === tpl._id;
              return (
                <div
                  key={tpl._id}
                  className={`${styles.templateCard} ${
                    isSelected ? styles.selected : ""
                  }`}
                  onClick={() => handleTemplateSelect(tpl)}
                >
                  <div className={styles.templateCardInner}>
                    {isSelected && (
                      <div className={styles.checkmark}>
                        <FaCheckCircle />
                      </div>
                    )}
                    {src ? (
                      <Image
                        src={src}
                        alt={alt || "template"}
                        width={129}
                        height={172}
                        className={styles.templateImage}
                        unoptimized={
                          src.startsWith("blob:") || src.startsWith("data:")
                        }
                      />
                    ) : (
                      <div className={styles.templateImage} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            {Array.from({ length: totalPages }).map((_, index) => (
              <div
                key={index}
                className={`${styles.dot} ${
                  index === currentPage ? styles.activeDot : ""
                }`}
                onClick={() => setCurrentPage(index)}
              />
            ))}
          </div>
        )}

        {checkedTemplate && (
          <p className={styles.selectedLabel}>
            {t("selected_template")}:{" "}
            <span className={styles.selectedName}>
              {isAr ? checkedTemplate.nameAr : checkedTemplate.nameEn}
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
