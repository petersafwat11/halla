"use client";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepThree.module.css";
import TemplatesCards from "./templatesCards/TemplatesCards";
import TemplateForm from "../templateForm/TemplateForm";
import UseLanguageChange from "@/hooks/UseLanguageChange";

export const templates = [
  {
    id: 1,
    name: "Classic Wedding",
    src: "/svg/events/template1.svg",
    width: 100,
    height: 120,
  },
  {
    id: 2,
    name: "Modern Elegant",
    src: "/svg/events/template2.svg",
    width: 100,
    height: 120,
  },
  {
    id: 3,
    name: "Romantic Rose",
    src: "/svg/events/template3.svg",
    width: 100,
    height: 120,
  },
];

const StepThree = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");
  const { currentLocale } = UseLanguageChange();

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);

  // templateImage stores the generated File (after TemplateForm) or SVG src (before customization)
  const templateImage = watch("templateImage");
  // selectedTemplate here is the visual template object (id/name/data) — distinct from Taqnyat selectedTemplate in step 4
  const visualTemplate = watch("visualTemplate");

  // Derive which card is checked: match by src for uncustomized, or by id for customized
  const checkedTemplate =
    templates.find((tpl) => tpl.id === visualTemplate?.id) ||
    templates.find((tpl) => tpl.src === templateImage) ||
    null;

  const handleTemplateSelect = (template) => {
    // If re-selecting the already-customized template, restore saved data into the form
    const withData =
      visualTemplate && template.id === visualTemplate.id
        ? { ...template, data: visualTemplate.data }
        : template;
    setActiveTemplate(withData);
    setShowTemplateForm(true);
  };

  // Called by TemplateForm: sets the generated image File + visual template data
  // We intercept to avoid overwriting the Taqnyat selectedTemplate (step 4)
  const handleSetEventValues = (key, value) => {
    if (key === "selectedTemplate" || key === "invitationSettings.selectedTemplate") {
      // Store as visualTemplate to keep it separate from the Taqnyat template in step 4
      setValue("visualTemplate", value, { shouldValidate: false });
      return;
    }
    if (key === "invitationSettings.templateImage") {
      setValue("templateImage", value, { shouldValidate: true });
      return;
    }
    setValue(key, value, { shouldValidate: key === "templateImage" });
  };

  return (
    <div className={styles.stepThree}>
      <div className={styles.templateSection}>
        <label className={styles.sectionLabel}>{t("select_template")}</label>
        <TemplatesCards
          templates={templates}
          selectedTemplate={checkedTemplate}
          onTemplateSelect={handleTemplateSelect}
        />
        {checkedTemplate && (
          <p className={styles.selectedLabel}>
            {t("selected_template")}:{" "}
            <span style={{ color: "#2a8c5b", fontWeight: 600 }}>
              {checkedTemplate.name}
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
