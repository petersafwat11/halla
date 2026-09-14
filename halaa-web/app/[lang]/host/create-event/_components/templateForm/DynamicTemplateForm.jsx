"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider, useFormContext, useWatch } from "react-hook-form";
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
import {
  createSingleFlight,
  templateBakeErrorKey,
} from "@halaa/shared/utils/invitationImagePlan";
import { renderField } from "./renderField";
import { layoutTemplateFields } from "./templateFieldLayout";
import { bakeTemplateImage, useBakeSafeTemplate } from "./useTemplateBake";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";
import styles from "./templateForm.module.css";

const FALLBACK_FONT_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "cairo", label: "Cairo" },
  { value: "lato", label: "Lato" },
];

/**
 * Subscribes to the template form with `useWatch`, so a keystroke re-renders
 * the canvas only — never the modal, its inputs or the wizard behind it.
 */
const LiveTemplatePreview = memo(function LiveTemplatePreview({
  control,
  template,
  fonts,
  colorKey,
  fontKey,
  previewRef,
}) {
  const data = useWatch({ control });
  // Empty slots show their field label while editing; the bake skips them.
  const primaryColor = colorKey ? data?.[colorKey] : "#5a4a42";
  const fontFamilyId = fontKey ? data?.[fontKey] : null;
  const fontFamilyOverride =
    fonts.find((f) => f.id === fontFamilyId)?.webFamily || fontFamilyId;

  return (
    <TemplatePreviewCanvas
      ref={previewRef}
      template={template}
      data={data}
      primaryColor={primaryColor}
      fontFamilyOverride={fontFamilyOverride}
      showPlaceholders
    />
  );
});

export default function DynamicTemplateForm({
  isOpen,
  onClose,
  locale,
  setEventValues,
  template,
  onDiscard,
}) {
  const { t } = useTranslation("createEvent");
  const previewRef = useRef(null);
  const mountedRef = useRef(true);
  const [saveFlight] = useState(createSingleFlight);
  const [bakePhase, setBakePhase] = useState(null);
  const [bakeErrorKey, setBakeErrorKey] = useState(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const isGenerating = bakePhase !== null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Event date/time only seed the defaults; reading them once keeps this
  // modal from re-rendering with the wizard form.
  const parentFormContext = useFormContext();
  const [defaultValues] = useState(() =>
    buildDefaultValues(
      template,
      parentFormContext?.getValues?.("eventDate"),
      parentFormContext?.getValues?.("eventTime")
    )
  );

  const { data: fontsData } = useFonts();
  const fonts = useMemo(() => fontsData?.data?.fonts || [], [fontsData]);
  const dynamicFontOptions = useMemo(
    () =>
      fonts.length
        ? fonts.map((f) => ({ value: f.id, label: f.id }))
        : FALLBACK_FONT_OPTIONS,
    [fonts]
  );

  const resolver = useMemo(
    () => zodResolver(buildDynamicTemplateSchema(template.fields, t)),
    [template.fields, t]
  );
  const methods = useForm({ resolver, defaultValues });
  const { handleSubmit, control, reset, formState: { isDirty } } = methods;

  const {
    template: previewTemplate,
    pending: backgroundPending,
    error: backgroundError,
    retry: retryBackground,
  } = useBakeSafeTemplate(template);

  const colorKey = template.fields.find((f) => f.type === "color")?.key;
  const fontKey = template.fields.find((f) => f.type === "font")?.key;
  const contentRows = useMemo(
    () =>
      layoutTemplateFields(
        template.fields.filter((field) => field.type !== "font" && field.type !== "color")
      ),
    [template.fields]
  );
  const styleRows = useMemo(
    () =>
      layoutTemplateFields(
        template.fields
          .filter((field) => field.type === "font" || field.type === "color")
          .sort((a, b) => (a.type === "font" ? -1 : b.type === "font" ? 1 : 0))
      ),
    [template.fields]
  );

  const requestClose = () => {
    // Never interrupt an in-flight save: its result commits atomically.
    if (saveFlight.busy) return;
    if (isDirty) {
      setShowDiscardConfirmation(true);
      return;
    }
    onClose();
  };

  const discardCustomization = () => {
    reset();
    onDiscard?.();
    setShowDiscardConfirmation(false);
    onClose();
  };

  const onSubmit = (data) => {
    if (saveFlight.busy) return undefined;
    return saveFlight.run(async () => {
      setBakeErrorKey(null);
      setBakePhase("preparing");
      try {
        const file = await bakeTemplateImage(previewRef, {
          naturalWidth: template?.naturalWidth,
          naturalHeight: template?.naturalHeight,
          onPhase: (phase) => {
            if (mountedRef.current) setBakePhase(phase);
          },
        });
        if (!mountedRef.current) return;
        // Commit the template reference and its image atomically. Allowing the
        // wizard to continue after a failed bake creates an IMAGE-header event
        // that cannot be delivered by WhatsApp.
        setEventValues("selectedTemplate", {
          ...template,
          fieldValues: data,
          data,
        });
        setEventValues("templateImage", file);
        setBakePhase(null);
        onClose();
      } catch (err) {
        console.error("[StepThree] template bake failed:", err);
        if (!mountedRef.current) return;
        // Keep the modal open with every entered value so the host can retry.
        setBakePhase(null);
        setBakeErrorKey(templateBakeErrorKey(err));
      }
    });
  };
  const submit = handleSubmit(onSubmit);

  const statusKey = bakePhase ? `template_${bakePhase}` : null;
  const visibleErrorKey =
    bakeErrorKey || (backgroundError ? "template_background_failed" : null);

  return (
    <>
      <PopupLayout isOpen={isOpen} onClose={requestClose} size="full">
        <div className={styles.header}>
          <h2>{t("edit_design_template")}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={requestClose}
            disabled={isGenerating}
          >
            <img src="/svg/events/close-circle.svg" alt="close" />
          </button>
        </div>
        <CardLayout className={styles.container}>
          <FormProvider {...methods}>
            <form className={styles.rightForm} onSubmit={submit}>
              <div className={styles.formGrid}>
                {contentRows.map(({ field, fullWidth }) => (
                  <div key={field.key} className={fullWidth ? styles.fullWidth : ""}>
                    {renderField(field, locale, dynamicFontOptions)}
                  </div>
                ))}
              </div>
              {styleRows.length > 0 && (
                <div className={styles.styleControls}>
                  {styleRows.map(({ field, fullWidth }) => (
                    <div
                      key={field.key}
                      className={`${styles.styleControl} ${fullWidth ? styles.fullWidth : ""}`}
                    >
                      {renderField(field, locale, dynamicFontOptions)}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className={styles.mobilePreviewBtn}
                onClick={() => setShowMobilePreview(true)}
              >
                <img src="/svg/events/eye.svg" alt="preview" />
                <span>{t("preview_invitation", "معاينة الدعوة")}</span>
              </button>
              {statusKey && (
                <p className={styles.bakeStatus} role="status" aria-live="polite">
                  {t(statusKey)}
                </p>
              )}
              {visibleErrorKey && !isGenerating && (
                <div className={styles.bakeError} role="alert">
                  <strong>{t("template_failed")}</strong>
                  <span>{t(visibleErrorKey)}</span>
                  <button
                    type="button"
                    className={styles.bakeRetry}
                    onClick={() => {
                      if (backgroundError || bakeErrorKey === "template_background_failed") {
                        setBakeErrorKey(null);
                        retryBackground();
                      } else {
                        submit();
                      }
                    }}
                  >
                    {t("template_retry")}
                  </button>
                </div>
              )}
              <div className={styles.buttonContainer}>
                <Button
                  variant="secondary"
                  onClick={requestClose}
                  title={t("cancel")}
                  type="button"
                  disabled={isGenerating}
                />
                <Button
                  variant="primary"
                  title={isGenerating ? t(statusKey) : t("save")}
                  type="submit"
                  disabled={isGenerating || backgroundPending}
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
              <LiveTemplatePreview
                previewRef={previewRef}
                control={control}
                template={previewTemplate}
                fonts={fonts}
                colorKey={colorKey}
                fontKey={fontKey}
              />
            </div>
          </FormProvider>
        </CardLayout>
      </PopupLayout>

      <DeleteConfirmation
        isOpen={showDiscardConfirmation}
        onClose={() => setShowDiscardConfirmation(false)}
        onConfirm={discardCustomization}
        title={t("template_discard_title")}
        message={t("template_discard_body")}
        confirmText={t("template_discard")}
        cancelText={t("template_continue_editing")}
      />

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
            <LiveTemplatePreview
              control={control}
              template={previewTemplate}
              fonts={fonts}
              colorKey={colorKey}
              fontKey={fontKey}
            />
          </div>
        </div>
      </PopupLayout>
    </>
  );
}
