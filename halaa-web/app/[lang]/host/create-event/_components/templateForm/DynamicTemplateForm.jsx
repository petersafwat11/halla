"use client";

import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CardLayout from "@/ui/commen/card/CardLayout";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import {
  buildDynamicTemplateSchema,
  buildDefaultValues,
} from "@/utils/schemas/createEventSchema";
import { useFonts } from "@/hooks/templates";
import TemplatePreviewCanvas from "@/components/shared/TemplatePreviewCanvas";
import { renderField } from "./renderField";
import { bakeTemplateImage } from "./useTemplateBake";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./templateForm.module.css";

const FALLBACK_FONT_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "cairo", label: "Cairo" },
  { value: "lato", label: "Lato" },
];

export default function DynamicTemplateForm({
  isOpen,
  onClose,
  locale,
  setEventValues,
  template,
}) {
  const { t } = useTranslation("createEvent");
  const previewRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const parentFormContext = useFormContext();
  const parentEventDate = parentFormContext?.watch("eventDate");
  const parentEventTime = parentFormContext?.watch("eventTime");

  const { data: fontsData } = useFonts();
  const fonts = fontsData?.data?.fonts || [];
  const dynamicFontOptions = fonts.length
    ? fonts.map((f) => ({ value: f.id, label: f.id }))
    : FALLBACK_FONT_OPTIONS;

  const methods = useForm({
    resolver: zodResolver(buildDynamicTemplateSchema(template.fields, t)),
    defaultValues: buildDefaultValues(template, parentEventDate, parentEventTime),
  });

  const { handleSubmit, watch } = methods;
  const formData = watch();

  const primaryColorField = template.fields.find((f) => f.type === "color");
  const fontField = template.fields.find((f) => f.type === "font");
  const primaryColor = primaryColorField ? formData[primaryColorField.key] : "#5a4a42";
  const fontFamilyId = fontField ? formData[fontField.key] : null;
  const fontFamilyOverride =
    fonts.find((f) => f.id === fontFamilyId)?.webFamily || fontFamilyId;

  const onSubmit = async (data) => {
    setIsGenerating(true);
    try {
      const file = await bakeTemplateImage(previewRef, {
        backgroundUrl: template?.imageUrl,
      });
      // Commit the template reference and its image atomically. Allowing the
      // wizard to continue after a failed bake creates an IMAGE-header event
      // that cannot be delivered by WhatsApp.
      setEventValues("selectedTemplate", {
        ...template,
        fieldValues: data,
        data,
      });
      setEventValues("templateImage", file);
      onClose();
    } catch (err) {
      console.error("[StepThree] template bake failed:", err);
      toastUtils.error(
        t(
          "template_bake_failed",
          "تعذر إنشاء صورة القالب. يرجى المحاولة مرة أخرى."
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <PopupLayout isOpen={isOpen} onClose={onClose} size="full">
        <div className={styles.header}>
          <h2>{t("edit_design_template")}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <img src="/svg/events/close-circle.svg" alt="close" />
          </button>
        </div>
        <CardLayout className={styles.container}>
          <FormProvider {...methods}>
            <form className={styles.rightForm} onSubmit={handleSubmit(onSubmit)}>
              <div className={styles.formGrid}>
                {template.fields.map((f) => (
                  <div
                    key={f.key}
                    className={f.type === "textarea" ? styles.fullWidth : ""}
                  >
                    {renderField(f, locale, dynamicFontOptions)}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={styles.mobilePreviewBtn}
                onClick={() => setShowMobilePreview(true)}
              >
                <img src="/svg/events/eye.svg" alt="preview" />
                <span>{t("preview_invitation", "معاينة الدعوة")}</span>
              </button>
              <div className={styles.buttonContainer}>
                <Button
                  variant="secondary"
                  onClick={onClose}
                  title={t("cancel")}
                  type="button"
                  disabled={isGenerating}
                />
                <Button
                  variant="primary"
                  title={isGenerating ? t("saving", "جاري الحفظ...") : t("save")}
                  type="submit"
                  disabled={isGenerating}
                />
              </div>
            </form>
            <div
              className={styles.leftPreview}
              style={{
                "--preview-ar":
                  template?.naturalWidth && template?.naturalHeight
                    ? template.naturalWidth / template.naturalHeight
                    : 0.8,
              }}
            >
              <TemplatePreviewCanvas
                ref={previewRef}
                template={template}
                data={formData}
                primaryColor={primaryColor}
                fontFamilyOverride={fontFamilyOverride}
              />
            </div>
          </FormProvider>
        </CardLayout>
      </PopupLayout>

      <PopupLayout
        isOpen={showMobilePreview}
        onClose={() => setShowMobilePreview(false)}
        size="auto"
      >
        <div className={styles.mobilePreviewModal}>
          <div className={styles.mobilePreviewHeader}>
            <h3>{t("preview_invitation", "معاينة الدعوة")}</h3>
            <button
              type="button"
              className={styles.mobilePreviewCloseBtn}
              onClick={() => setShowMobilePreview(false)}
              aria-label="close"
            >
              <img src="/svg/events/close-circle.svg" alt="close" />
            </button>
          </div>
          <div className={styles.mobilePreviewCanvasWrapper}>
            <TemplatePreviewCanvas
              template={template}
              data={formData}
              primaryColor={primaryColor}
              fontFamilyOverride={fontFamilyOverride}
            />
          </div>
        </div>
      </PopupLayout>
    </>
  );
}
